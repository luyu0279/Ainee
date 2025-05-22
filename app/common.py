import asyncio
import base64
import functools
import logging
import time
from enum import Enum
from io import BytesIO
from typing import TypeVar, Generic, Optional, List
from PIL import Image
import aiohttp
import requests
from pydantic import BaseModel, HttpUrl
import langcodes 
from app.database.models.content import ContentMediaType
import regex as re
from langdetect import detect, detect_langs
from langid.langid import LanguageIdentifier, model
logger = logging.getLogger(__name__)

DataModelType = TypeVar("DataModelType")
identifier = LanguageIdentifier.from_modelstring(model, norm_probs=True)

class ResponseCode(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FILE_TYPE_NOT_SUPPORTED = "FILE_TYPE_NOT_SUPPORTED"
    FILE_SIZE_TOO_LARGE = "FILE_SIZE_TOO_LARGE"
    MISSING_DEVICE_ID = "MISSING_DEVICE_ID"
    FACE_CHECK_FAILED = "FACE_CHECK_FAILED"
    SINGLE_AUDIO_EXCEEDS_DURATION_LIMIT = "SINGLE_AUDIO_EXCEEDS_DURATION_LIMIT"
    TOTAL_AUDIO_EXCEEDS_DURATION_LIMIT = "TOTAL_AUDIO_EXCEEDS_DURATION_LIMIT"

class CommonResponse(BaseModel, Generic[DataModelType]):
    code: ResponseCode
    data: DataModelType
    message: str = ""


class Source(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None


class Article(BaseModel):
    source: Optional[Source] = None
    author: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[HttpUrl] = None
    urlToImage: Optional[HttpUrl] = None
    publishedAt: Optional[str] = None  # 可以将其改为 datetime 类型以便于日期处理
    content: Optional[str] = None

    class Config:
        from_attributes = True  # Replaces the old 'orm_mode'


class NewsResponse(BaseModel):
    status: str
    totalResults: int
    articles: List[Article]


def success(data):
    return CommonResponse(code=ResponseCode.SUCCESS, data=data, message="")


def failed(message):
    return CommonResponse(code=ResponseCode.FAILED, data=None, message=message)


def failed_with_code(code, message=None, data=None):
    return CommonResponse(code=code, data=data, message=message)


def retry_async(exception_to_check, tries=3, delay=3, backoff=2):
    def decorator_retry(func):
        @functools.wraps(func)
        async def wrapper_retry(*args, **kwargs):
            attempts = tries
            current_delay = delay
            while attempts > 1:
                try:
                    return await func(*args, **kwargs)
                except exception_to_check as e:
                    logger.warning(f"Exception: {e}, Retrying in {current_delay} seconds...")
                    await asyncio.sleep(current_delay)  # Use asyncio.sleep for async context
                    attempts -= 1
                    current_delay *= backoff
            # Final attempt
            return await func(*args, **kwargs)

        return wrapper_retry

    return decorator_retry


def retry_sync(exception_to_check, tries=3, delay=3, backoff=2):
    def decorator_retry(func):
        @functools.wraps(func)
        def wrapper_retry(*args, **kwargs):
            attempts = tries
            current_delay = delay
            while attempts > 1:
                try:
                    return func(*args, **kwargs)
                except exception_to_check as e:
                    logger.info(f"Exception: {e}, Retrying in {current_delay} seconds...")
                    time.sleep(current_delay)
                    attempts -= 1
                    current_delay *= backoff
            return func(*args, **kwargs)

        return wrapper_retry

    return decorator_retry


async def image_url_resize_and_to_base64(url, max_size=800, quality=80):
    try:
        # 使用 aiohttp 异步请求图片数据
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()  # 检查是否请求成功
                img_data = await response.read()

                # 使用 Pillow 打开图像
                img = Image.open(BytesIO(img_data))

                # 获取图像的宽度和高度
                width, height = img.size

                # 如果宽度或高度大于最大限制，按比例缩放图像
                if width > max_size or height > max_size:
                    if width > height:
                        new_width = max_size
                        new_height = int((max_size / float(width)) * height)
                    else:
                        new_height = max_size
                        new_width = int((max_size / float(height)) * width)

                    # 缩放图像
                    img = img.resize((new_width, new_height), Image.LANCZOS)

                # 将图像转换为 Base64 编码
                buffered = BytesIO()

                # 如果图像模式为 RGBA，转换为 RGB
                if img.mode == 'RGBA':
                    img = img.convert('RGB')

                img.save(buffered, format="JPEG", quality=quality)
                image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

                return image_base64

    except Exception as e:
        print(f"Error fetching image: {e}")
        return None


def format_with_commas(number_str):
    try:
        # 转换字符串为整数
        number = int(number_str)
        # 使用字符串格式化添加千分位
        return f"{number:,}"
    except ValueError:
        # 如果输入不是合法数字字符串，抛出异常
        raise ValueError("Input must be a valid integer string.")


def is_audio_type(media_type: ContentMediaType) -> bool:
    """Check if the media type is an audio type"""
    return media_type in [
        ContentMediaType.audio,
        ContentMediaType.audio_internal,
        ContentMediaType.audio_microphone,
        ContentMediaType.spotify_audio
    ]


def normalize_language_code(language_code: Optional[str]) -> Optional[str]:
    """
    将语言代码标准化为 ISO 639-1 格式
    
    Args:
        language_code: 输入的语言代码 (可以是 BCP-47 或其他格式)
        
    Returns:
        str: ISO 639-1 格式的语言代码，如果无法转换则返回 None
        
    Examples:
        >>> normalize_language_code('en-AU')  # 返回 'en'
        >>> normalize_language_code('eng')     # 返回 'en'
        >>> normalize_language_code('zh-Hans') # 返回 'zh'
    """
    if not language_code:
        return None
        
    try:
        # 解析语言代码
        lang = langcodes.Language.get(language_code)
        # 获取 ISO 639-1 格式
        return lang.language if lang else None
    except (ValueError, LookupError):
        logger.warning(f"Failed to normalize language code: {language_code}")
        return None


def get_friendly_language_name(language_code: Optional[str]) -> Optional[str]:
    """
    将 ISO 639-1 语言代码转换为友好的语言名称
    
    Args:
        language_code: ISO 639-1 格式的语言代码
        
    Returns:
        str: 友好的语言名称，如果无法转换则返回 None
        
    Examples:
        >>> get_friendly_language_name('en')  # 返回 'English'
        >>> get_friendly_language_name('zh')  # 返回 'Chinese'
        >>> get_friendly_language_name('ja')  # 返回 'Japanese'
    """
    if not language_code:
        return None
        
    try:
        # 解析语言代码
        lang = langcodes.Language.get(language_code)
        # 获取语言名称
        return lang.display_name() if lang else None
    except (ValueError, LookupError):
        logger.warning(f"Failed to get friendly language name for code: {language_code}")
        return None


def format_subtitles(subtitles: list) -> str:
    """Format video subtitles into mm:ss - mm:ss, text format"""
    formatted_subtitles = []
    for subtitle in subtitles:
        start_time = float(subtitle["start"])
        end_time = start_time + float(subtitle["duration"])
        formatted_subtitles.append(
            f"{int(start_time//60):02d}:{int(start_time%60):02d} - {int(end_time//60):02d}:{int(end_time%60):02d}, {subtitle['text']}"
        )
    return "\n".join(formatted_subtitles)



def extract_json(cell1) -> Optional[str]:
    # 定义匹配 JSON 的正则表达式
    json_pattern = re.compile(r'''
        (                               # Start of capture group
            \{                          # Match the opening brace of the object
            (?:                         # Non-capturing group to match object contents
                [^{}]*                  # Match any character except braces
                |                       # OR
                \{(?:[^{}]*|(?1))*\}    # Recursively match objects
                |                       # OR
                \[(?:[^\[\]]*|(?1))*\]  # Recursively match arrays
            )*                          # Repeat to match the entire object contents
            \}                          # Match the closing brace of the object
            |                           # OR
            \[                          # Match the opening bracket of the array
            (?:                         # Non-capturing group to match array contents
                [^\[\]]*                # Match any character except brackets
                |                       # OR
                \{(?:[^{}]*|(?1))*\}    # Recursively match objects
                |                       # OR
                \[(?:[^\[\]]*|(?1))*\]  # Recursively match arrays
            )*                          # Repeat to match the entire array contents
            \]                          # Match the closing bracket of the array
        )                               # End of capture group
    ''', re.VERBOSE | re.DOTALL)

    matches = json_pattern.findall(cell1)

    # 检查匹配结果并返回第一个匹配的 JSON 字符串
    if matches:
        return matches[0]
    return None


def merge_subtitles(subtitles, min_duration=30):
    merged = []
    current_segment = None
    
    for subtitle in subtitles:
        if current_segment is None:
            # Start new segment
            current_segment = subtitle.copy()
            # Round start time to 3 decimal places
            current_segment['start'] = round(float(current_segment['start']), 3)
            current_segment['duration'] = round(float(current_segment['duration']), 3)
        else:
            # Merge text
            current_segment['text'] += " " + subtitle['text']
            # Update duration and round to 3 decimal places
            current_segment['duration'] = round(float(subtitle['start'] + subtitle['duration'] - current_segment['start']), 3)
            
            # If minimum duration reached, add to results
            if current_segment['duration'] >= min_duration:
                merged.append(current_segment)
                current_segment = None
    
    # Add last segment (even if it doesn't meet minimum duration)
    if current_segment is not None:
        merged.append(current_segment)
    
    return merged


def detect_lang(text: str) -> str:
    try:
        text = text[:10000]
        text = text.encode('utf-8').decode('utf-8')
        lang = identifier.classify(text[:1000])[0]
        normalized = get_friendly_language_name(lang)
        if normalized:
            return normalized
        else:
            # 如果无法标准化语言代码，则返回原始语言代码
            return lang
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        return "English"
        