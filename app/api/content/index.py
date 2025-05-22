from concurrent.futures import ThreadPoolExecutor
import logging
import os
import time
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, Form, File, Body
import magic
import nanoid
from pydantic import BaseModel, Field
from typing import Optional, List
import httpx
import hashlib
from datetime import datetime, timezone
import asyncio
import validators
import re
from app.api.file.file import upload_file_size_is_valid, upload_file_type_is_valid, DEFAULT_UPLOAD_PATH, \
    storage
from app import (
    settings,
)
from app.database.repositories.knowledge_base_repository import (
    knowledge_base_repository,
    content_kb_mapping_repository,
)
from app.database.repositories.content_repository import (
    content_repository,
)
from app.database.models.knowledge_base import KnowledgeBase, ContentKnowledgeBaseMapping
from enum import Enum
from app.database.utils import require_user
from app.context import context_user
from app.database.models.content import Content, ContentMediaType, ProcessingStatus
from app.common import (
    CommonResponse,
    ResponseCode,
    failed_with_code,
    is_audio_type,
    normalize_language_code,
    success,
    failed,
)  # Import success and fail functions
from app.services.youtube_audio_file_service import YouTubeAudioFileService
from app.services.youtube_audio_file_service_ng import YouTubeAudioFileServiceNG
from app.services.youtube_service import YouTubeService, YouTubeVideoInfo
from app.workers import content as content_worker
import json
from app.services.content_processor import ContentProcessor
import tempfile
from mutagen import File as MutagenFile
import urllib.parse
from app.services.spotify_service import spotify_service
from app.services.twitter import TwitterService
from sqlalchemy import update, select, and_
from app.database.session import get_async_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/content", tags=["Content"])

# 请求和响应模型
class CreateContentRequest(BaseModel):
    url: Optional[str] = Field(None, description="The URL of the content to be created.")
    file: Optional[UploadFile] = Field(None, description="The file content to be created.")

class SubtitleSegment(BaseModel):
    text: str = Field(..., description="The subtitle text")
    start: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")

class KnowledgeBaseInfo(BaseModel):
    uid: str = Field(..., description="知识库唯一标识")
    name: str = Field(..., description="知识库名称")

class ContentResponse(BaseModel):
    uid: str
    title: Optional[str] = Field(None, description="The title of the content.")
    # content_hash: Optional[str] = Field(None, description="The hash of the content.")
    site_name: Optional[str] = Field(None, description="The name of the source site.")
    author: Optional[str] = Field(None, description="The author of the content.")
    lang: Optional[str] = Field(None, description="The language of the content.")
    published_time: Optional[datetime] = Field(
        None, description="The time the content was published."
    )
    cover: Optional[str] = Field(None, description="The cover image URL.")
    images: Optional[List[str]] = Field(None, description="The image URLs.")
    source: Optional[str] = Field(None, description="The original URL of the content.")
    processing_status: ProcessingStatus
    created_at: Optional[datetime] = Field(
        None, description="The time the content was created."
    )
    description: Optional[str] = Field(None, description="The description of the content.")
    content: Optional[str] = Field(None, description="The content.")
    page_url: Optional[str] = Field(None, description="The page URL of the content.")
    view_count: int = Field(0, description="The number of views")
    share_count: int = Field(0, description="The number of shares")
    ai_mermaid: Optional[str] = Field(
        None, description="The AI generated mermaid diagram"
    )
    ai_structure: Optional[str] = Field(
        None, description="The AI generated structure"
    )
    ai_recommend_reason: Optional[str] = Field(
        None, description="The AI generated recommendation reason"
    )
    ai_summary: Optional[str] = Field(None, description="The AI generated summary")
    text_content: Optional[str] = Field(
        None, description="Plain text version of the content"
    )
    ai_tags: Optional[List[str]] = Field(None, description="AI generated tags")
    media_type: ContentMediaType = Field(ContentMediaType.article, description="The media type of the content")
    media_subtitles: Optional[List[SubtitleSegment]] = Field(None, description="The media subtitles as structured segments")
    video_embed_html: Optional[str] = Field(None, description="The video embed URL")
    file_url: Optional[str] = Field(None, description="The file url")
    image_ocr: Optional[str] = Field(None, description="The OCR result from the image")
    shownotes: Optional[str] = Field(None, description="The show notes for the content")
    belonged_kbs: Optional[List[KnowledgeBaseInfo]] = Field(None, description="内容所属的知识库列表，可为空")
    owned: bool = Field(False, description="是否拥有该内容的权限")


class UserContentsData(BaseModel):
    """用户文章列表的返回数据结构"""

    contents: List[ContentResponse]
    next_cursor: Optional[str] = Field(None, description="下一页的游标")


class MediaItem(BaseModel):
    media_type: ContentMediaType
    file_name: str
    kb_uid: Optional[str] = Field(None, description="The ID of the knowledge base this content should be assigned to")


class BatchCreatedItemReponse(BaseModel):
    uid: str
    status: ProcessingStatus
    media_type: ContentMediaType
    file_name: str


class CopyContentsRequest(BaseModel):
    uids: List[str] = Field(..., description="The UIDs of the contents to be copied.")


class EditContentRequest(BaseModel):
    uid: str = Field(..., description="The UID of the content to edit")
    title: Optional[str] = Field(None, description="New title for the content")
    tags: Optional[List[str]] = Field(None, description="New AI tags for the content")
    add_to_kb_ids: Optional[List[str]] = Field(None, description="List of knowledge base IDs to add the content to")


thread_pool = ThreadPoolExecutor(max_workers=4)

async def get_file_mime_type(payload: UploadFile) -> str:
    """异步检测文件 MIME 类型"""
    mime = magic.Magic(mime=True)

    # 使用异步方式读取文件内容
    chunk = await payload.read(1024)

    # 在线程池中运行 CPU 密集型的 MIME 检测
    detected_mime = await asyncio.get_event_loop().run_in_executor(
        thread_pool,
        mime.from_buffer,
        chunk
    )

    # 重置文件指针
    await payload.seek(0)
    return detected_mime


@router.post(
    "/create",
    response_model=CommonResponse[ContentResponse],
    summary="Create Content",
    description="Create new content from a given URL.",
)
async def create_content(request: CreateContentRequest):
    if not validators.url(request.url):
        return failed("Invalid URL")

    url = request.url

    # Check if user already has content with this URL
    existing_content = await content_repository.get_by_url(url)
    if existing_content:
        # Update the timestamp for existing content
        await content_repository.update(
            content_id=existing_content.id, updated_at=datetime.utcnow()
        )
        return success(
            data=ContentResponse.model_validate(existing_content.__dict__),
        )

    is_youtube_url, youtube_id = YouTubeService.parse_youtube_url(url)
    media_type = ContentMediaType.video if is_youtube_url else ContentMediaType.article

    content = await content_repository.create(
        uid=nanoid.generate().lower(),
        source=url,
        processing_status=ProcessingStatus.PENDING,
        is_deleted=False,
        media_type=media_type,
    )

    if is_youtube_url:
        asyncio.create_task(ContentProcessor.process_youtube_content(content.id))
    else:
        asyncio.create_task(ContentProcessor.process_article_content(content.id))

    return success(data=ContentResponse.model_validate(content.__dict__))


async def _check_audio_task_limit(user_id: int) -> bool:
    """检查用户是否还能创建音频任务"""
    try:
        # 获取用户当前音频总时长
        user_audio_total_duration = await content_repository.get_user_total_audio_duration()
        
        # 检查是否超过限制
        return user_audio_total_duration < settings.total_audio_max_seconds_duration
    except Exception as e:
        logger.error(f"Failed to check audio task limit: {str(e)}")
        return False

@router.get(
    "/can_create_audio_task",
    response_model=CommonResponse[bool],
    summary="Check if user can create audio task",
    description="Check if the current user can create new audio tasks based on their limit",
)
async def can_create_audio_task():
    try:
        # 从上下文中获取当前用户
        user = context_user.get()
        if not user:
            return failed("User not found")
        
        # 使用抽象函数检查
        can_create = await _check_audio_task_limit(user.id)
       
        if can_create:
            return success(data=can_create)
        
        return failed_with_code(
            code=ResponseCode.TOTAL_AUDIO_EXCEEDS_DURATION_LIMIT,
            data=False,
            message=f"Total audio duration exceeds {settings.total_audio_max_seconds_duration / 3600} hours limit"
        )
    except Exception as e:
        logger.error(f"Failed to check audio task creation: {str(e)}")
        return failed("Failed to check audio task creation")


@router.post(
    "/batch_create",
    response_model=CommonResponse[Optional[List[BatchCreatedItemReponse]]],
    summary="Batch Create Content",
    description="Create new content from a list of URLs or files.",
)
async def batch_create(items: List[MediaItem] = Body(..., description="The list of media items to be created.")):
    if not items:
        return failed("No items provided")
    
    if len(items) > 50:
        return failed("Too many items provided, maximum is 50")
    
    # 检查是否包含音频文件
    has_audio = any(is_audio_type(item.media_type) for item in items)
    
    # 如果包含音频文件，检查用户总音频时长
    if has_audio:
        user = context_user.get()
        if not user:
            return failed("User not found")
        
        if not await _check_audio_task_limit(user.id):
            return failed_with_code(
                code=ResponseCode.TOTAL_AUDIO_EXCEEDS_DURATION_LIMIT,
                message="Total audio duration exceeds 50 hours limit"
            )
    
    created_contents = []
    user = context_user.get()
    batch_id = nanoid.generate().lower()

    kb_uids = [item.kb_uid for item in items if item.kb_uid]
    will_use_kb: list[KnowledgeBase] = []

    if kb_uids and len(kb_uids) > 0:
        # Check if the user owns the knowledge base
        for kb_uid in kb_uids:
            kb = await knowledge_base_repository.verify_ownership(kb_uid, user.id)
            if not kb:
                return failed(f"You don't own one or some of the knowledge bases")
            will_use_kb.append(kb)

    def get_kb(kb_id: str) -> Optional[KnowledgeBase]:
        for kb in will_use_kb:
            if kb.uid == kb_id:
                return kb
        return None


    for item in items:
        # Validate media type
        if not isinstance(item.media_type, ContentMediaType):
            return failed(f"Invalid media type: {item.media_type}")
            
        # Create content with the file URL
        uid = nanoid.generate().lower()
        content = await content_repository.create(
            uid=uid,
            processing_status=ProcessingStatus.WAITING_INIT,
            is_deleted=False,
            media_type=item.media_type,
            source=None,
            batch_id=batch_id,
        )

        if(item.kb_uid):
            await content_kb_mapping_repository.add_content(content.id, get_kb(item.kb_uid).id, user.id)

        created_contents.append(BatchCreatedItemReponse(
            uid=uid,
            status=ProcessingStatus.PENDING, # 前端只关心 PENDING 状态
            file_name=item.file_name,
            media_type=item.media_type,
        ))

    return success(data=created_contents)


async def _process_upload_file(
    file: UploadFile, 
    media_type: ContentMediaType,
    audio_language: Optional[str] = None
) -> dict:
    """
    Common function to process uploaded files for content
    
    Args:
        file: The uploaded file
        media_type: The type of media being uploaded  
        audio_language: Optional language code for audio files
        
    Returns:
        dict: Processing results containing file info and metadata
    """
    if not file or file.size <= 0:
        raise ValueError("Valid file must be provided")
    
    # Process file info
    file_type = await get_file_mime_type(file)
    file_name = file.filename
    timestamp = int(time.time())
    file_hash = hashlib.md5(f"{context_user.get().uid}{timestamp}{file_name}".encode()).hexdigest()
    file_extension = os.path.splitext(file_name)[1]
    new_file_name = f"{file_hash}{file_extension}"
    uri = os.path.join(DEFAULT_UPLOAD_PATH, f"{new_file_name}")
    file_content = await file.read()
    
    # Check audio duration if needed
    duration = None
    if is_audio_type(media_type):
        try:
            with tempfile.NamedTemporaryFile(mode='wb', delete=False) as tmp_file:
                try:
                    tmp_file.write(file_content)
                    tmp_file.flush()
                    
                    duration = get_audio_duration(tmp_file.name)
                    if duration > settings.single_audio_max_seconds_duration:
                        raise ValueError("Audio file duration exceeds 60 minutes limit", 
                                        ResponseCode.SINGLE_AUDIO_EXCEEDS_DURATION_LIMIT)
                
                except Exception as e:
                    logger.error(f"Failed to get audio duration: {str(e)}")
                    raise ValueError("Failed to process audio file")
                finally:
                    try:
                        os.unlink(tmp_file.name)
                    except Exception as e:
                        logger.warning(f"Failed to delete temporary file: {str(e)}")
        except ValueError as e:
            if len(e.args) > 1:
                raise ValueError(e.args[0], e.args[1])
            raise ValueError("Failed to process audio file")
        except Exception as e:
            logger.error(f"Failed to check audio duration: {str(e)}")
            raise ValueError("Failed to process audio file")
    
    # Save file
    await storage.save(uri, file_content)
    logger.info(f"File saved to {uri}")
    
    # Extract title from filename
    title = os.path.splitext(file_name)[0]
    
    return {
        "file_type": file_type,
        "title": title,
        "uri": uri,
        "duration": duration,
        "language": is_audio_type(media_type) and normalize_language_code(audio_language) or None
    }


@router.post(
    "/create_upload_and_pend",
    response_model=CommonResponse[Optional[ContentResponse]],
    summary="Create, upload and make content pending",
    description="Create, upload and make content pending",
)
async def create_upload_and_pends(
    source_url: Optional[str] = Form(None, description="The source of the content."),
    media_type: ContentMediaType = Form(..., description="The media type of the content."),
    file: UploadFile = File(..., description="The file content to be created."),
    audio_language: Optional[str] = Form(None, description="The language of the audio file."),
):
    try:
        # Process uploaded file
        file_data = await _process_upload_file(file, media_type, audio_language)
        # Create content with the file URL
        content = await content_repository.create(
            uid=nanoid.generate().lower(),
            processing_status=ProcessingStatus.PENDING,
            media_type=media_type,
            source=source_url if source_url else None,
            file_name_in_storage=file_data["uri"],
            title=file_data["title"],
            file_type=file_data["file_type"],
            lang=file_data["language"],
            media_seconds_duration=file_data["duration"] if is_audio_type(media_type) else None,
        )

        if not content:
            return failed("Failed to create content")
        
        # Schedule processing
        if is_audio_type(content.media_type):
            asyncio.create_task(ContentProcessor.audio_asr(content.id))
        else:
            asyncio.create_task(ContentProcessor.process_file(content.id))

        return success(data=ContentResponse.model_validate(content.__dict__))
    except ValueError as e:
        if len(e.args) > 1 and isinstance(e.args[1], ResponseCode):
            return failed_with_code(code=e.args[1], message=e.args[0])
        return failed(str(e))
    except Exception as e:
        logger.error(f"Error in upload_and_pends: {str(e)}")
        return failed("Failed to process upload")
    

@router.post(
    "/upload_and_pend",
    response_model=CommonResponse[Optional[ContentResponse]],
    summary="Upload and make content pending",
    description="Upload a file",
)
async def upload_and_pends(
    uid: str = Form(..., description="The UID of the content to be created."),
    file: UploadFile = File(..., description="The file content to be created."),
    audio_language: Optional[str] = Form(None, description="The language of the audio file."),
):
    try:
        # Validate existing content
        existing_content = await content_repository.get_by_uid(uid)
        if not existing_content:
            return failed("Content not found")
        
        if existing_content.processing_status.value != ProcessingStatus.WAITING_INIT.value:
            return failed("Content status is fullfilled")
        
        # Process uploaded file
        file_data = await _process_upload_file(file, existing_content.media_type, audio_language)
        
        # Update content with file information
        content = await content_repository.update(
            content_id=existing_content.id,
            processing_status=ProcessingStatus.PENDING,
            file_name_in_storage=file_data["uri"],
            title=file_data["title"],
            file_type=file_data["file_type"],
            lang=file_data["language"],
            media_seconds_duration=file_data["duration"] if is_audio_type(existing_content.media_type) else None
        )

        if not content:
            return failed("Failed to update content")
        
        # Schedule processing
        if is_audio_type(existing_content.media_type):
            asyncio.create_task(ContentProcessor.audio_asr(existing_content.id))
        else:
            asyncio.create_task(ContentProcessor.process_file(existing_content.id))

        return success(data=ContentResponse.model_validate(content.__dict__))
    except ValueError as e:
        if len(e.args) > 1 and isinstance(e.args[1], ResponseCode):
            return failed_with_code(code=e.args[1], message=e.args[0])
        return failed(str(e))
    except Exception as e:
        logger.error(f"Error in upload_and_pends: {str(e)}")
        return failed("Failed to process upload")


@router.post(
    "/create_by_url",
    response_model=CommonResponse[Optional[ContentResponse]],
    summary="Create Content By URL",
    description="Create new content from a given URL or file.",
)
async def create_by_url(
    url: Optional[str] = Form(None, description="The URL of the content to be created."),
):
    if not url:
        return failed("Either URL or valid file must be provided")

    if not validators.url(url):
        return failed("Invalid URL")

    # Check if user already has content with this URL
    existing_content = await content_repository.get_by_url(url)
    if existing_content:
        await content_repository.update(
            content_id=existing_content.id, updated_at=datetime.utcnow()
        )
        return success(
            data=ContentResponse.model_validate(existing_content.__dict__),
        )

    is_youtube_url, youtube_id = YouTubeService.parse_youtube_url(url)
    is_spotify_url, spotify_id = spotify_service.parse_spotify_url(url)
    is_twitter_url = TwitterService.is_twitter_url(url)

    if is_youtube_url:
        media_type = ContentMediaType.video
    if is_twitter_url:
        media_type = ContentMediaType.twitter
    elif is_spotify_url:
        user = context_user.get()
        
        if not await _check_audio_task_limit(user.id):
            return failed_with_code(
                code=ResponseCode.TOTAL_AUDIO_EXCEEDS_DURATION_LIMIT,
                message="Total audio duration exceeds 50 hours limit"
            )
        media_type = ContentMediaType.spotify_audio
    else:
        media_type = ContentMediaType.article

    content = await content_repository.create(
        uid=nanoid.generate().lower(),
        batch_id=nanoid.generate().lower(),
        source=url,
        processing_status=ProcessingStatus.PENDING,
        is_deleted=False,
        media_type=media_type,
    )

    if is_youtube_url:
        asyncio.create_task(ContentProcessor.process_youtube_content(content.id))
    elif is_spotify_url:
        asyncio.create_task(ContentProcessor.process_spotify_content(content.id))
    elif is_twitter_url:
        asyncio.create_task(ContentProcessor.process_twitter_content(content.id))
    else:
        asyncio.create_task(ContentProcessor.process_article_content(content.id))

    return success(data=ContentResponse.model_validate(content.__dict__))

def generate_video_embed_html(video_embed_url: Optional[str]) -> Optional[str]:
    """
    Generate video embed HTML from the given URL.
    
    Args:
        video_embed_url: The URL of the video to embed
        
    Returns:
        The generated HTML if URL is provided, None otherwise
    """
    if not video_embed_url:
        return None
    
    logger.info(f"Generating video embed HTML for URL: {video_embed_url}")
        
    # Add enablejsapi=1 to the URL
    if '?' in video_embed_url:
        embed_url = f"{video_embed_url}&enablejsapi=1"
    else:
        embed_url = f"{video_embed_url}?enablejsapi=1"
        
    return f'<iframe width="100%" height="221" src="{embed_url}" frameborder="0" ' \
           'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; ' \
           'picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe>'


def extract_one_sentence_hook(text: str) -> str:
    # 兼容旧版的正则表达式
    hook_pattern = re.compile(r'### \*\*One-Sentence Hook\*\*\s*\n+([\s\S]+?)\n+\s*### \*\*Key Points\*\*')
    match = hook_pattern.search(text)
    
    # 验证匹配有效性
    if match and match.group(1):
        content = match.group(1).strip()
        return content if content else text
    return text


def get_content_description(content: dict) -> Optional[str]:
    """获取内容的描述信息"""
    if content.get("media_type") == ContentMediaType.video and content.get("raw_description"):
        return content["raw_description"].replace("\n", "")
    
    if not content["ai_summary"]:
        return None
   
    summary_from_ai = extract_one_sentence_hook(content["ai_summary"])

    if summary_from_ai:
        return summary_from_ai
    
    return None


async def process_content_dict(content_dict: dict, logger) -> dict:
    """
    处理 content_dict，添加或修改必要的字段
    :param content_dict: 内容字典
    :param logger: 日志记录器
    :return: 处理后的内容字典
    """
    # 处理 media_subtitles 字段
    media_subtitles = content_dict.get("media_subtitles")
    content_dict["media_subtitles"] = parse_subtitles(media_subtitles) or []  # 确保不为 None

    # 生成 video_embed_html
    content_dict["video_embed_html"] = generate_video_embed_html(content_dict.get("video_embed_url"))
    
    # 添加 description 字段
    content_dict["description"] = get_content_description(content_dict)
    
    # 当 media_type 为 pdf 或 audio 时，返回 file_url
    if content_dict.get("file_name_in_storage"):
        try:
            content_dict["file_url"] = storage.get_url(content_dict["file_name_in_storage"])
        except Exception as e:
            logger.error(f"Failed to get file URL: {str(e)}")
            content_dict["file_url"] = None
    else:
        content_dict["file_url"] = None
    
    # 添加 page_url 到返回数据
    content_dict["page_url"] = get_page_url(content_dict["uid"])
    
    # 修改 processing_status
    if content_dict.get("processing_status") == ProcessingStatus.WAITING_INIT:
        content_dict["processing_status"] = ProcessingStatus.PENDING

    if content_dict.get("media_type") in [ContentMediaType.video, ContentMediaType.spotify_audio]:
        content_dict["shownotes"] = content_dict.get("raw_description")

    if context_user.get() and content_dict.get("user_id") == context_user.get().id:
        content_dict["owned"] = True

    return content_dict

@router.post(
    "/uids",
    response_model=CommonResponse[Optional[List[ContentResponse]]],
    summary="Get Contents by UIDs",
    description="Retrieve multiple contents by their unique identifiers (UIDs).",
)
async def get_contents_by_uids(uids: List[str]):
    contents = await content_repository.get_by_uids(uids)
    if not contents:
        logger.error(f"Contents not found, UIDs: {uids}")
        return failed("Contents not found")

    response_data = [await process_content_dict(content.__dict__, logger) for content in contents]
    return success(data=[ContentResponse.model_validate(item) for item in response_data])


@router.get(
    "/uid/{uid}",
    response_model=CommonResponse[Optional[ContentResponse]],
    summary="Get Content by UID",
    description="Retrieve content by its unique identifier (UID).",
)
async def get_content_by_uid(uid: str):
    content = await content_repository.get_by_uid(uid, False)

    if not content:
        logger.error(f"Content not found, UID: {uid}") 
        return failed("Content not found")
    response_data = await process_content_dict(content.__dict__, logger)
    user = context_user.get()
    if user:
        belonged_kbs = await knowledge_base_repository.get_knowledge_bases_by_content_or_user(content.id, user.id)
        # Transform the knowledge base data to match KnowledgeBaseInfo model
        response_data["belonged_kbs"] = [
            {"uid": kb["uid"], "name": kb["name"]} for kb in belonged_kbs
        ] if belonged_kbs else None

    return success(data=ContentResponse.model_validate(response_data))


def get_page_url(uid: str) -> str:
    logger.info(settings.content_detail_page_url)
    return f"{settings.content_detail_page_url}/{uid}"


def process_content_for_list(content: Content) -> dict:
    """
    Process a content object for list display, excluding certain fields and formatting others.
    
    Args:
        content: Content object to process
        
    Returns:
        dict: Processed content dictionary ready for response
    """
    if content is None:
        return None
        
    return {
        **{
            k: v
            for k, v in content.__dict__.items()
            if k != "content"
            and k != "ai_mermaid"
            and k != "ai_structure"
            and k != "media_subtitles" 
            and v is not None  # Exclude None values
        },
        "page_url": get_page_url(content.uid),
        "description": get_content_description(content.__dict__),
        "text_content": None,
        "created_at": content.created_at.replace(tzinfo=timezone.utc) if content.created_at else None,
        "processing_status": ProcessingStatus.PENDING if content.processing_status == ProcessingStatus.WAITING_INIT else content.processing_status,
        "cover": content.cover,
        "owned": True if context_user.get() and content.user_id == context_user.get().id else False,
    }

@router.get(
    "/user/contents",
    response_model=CommonResponse[UserContentsData],
    summary="Get Current User's Contents",
    description="Retrieve all contents of the current user using cursor-based pagination.",
)
async def get_user_contents(cursor: Optional[str] = None, limit: int = 100):
    contents, next_cursor = await content_repository.get_all_by_user_id(
        cursor=cursor, limit=limit
    )

    response_data = UserContentsData(
        contents=[
            ContentResponse.model_validate(process_content_for_list(content))
            for content in contents
            if content is not None
        ],
        next_cursor=next_cursor,
    )

    return success(data=response_data)


class RetryContentRequest(BaseModel):
    uid: str = Field(..., description="The UID of the content to retry processing.")


@router.post(
    "/create/retry",
    response_model=CommonResponse[ContentResponse],
    summary="Retry Content Processing",
    description="Retry processing of a content that belongs to the current user.",
)
async def retry_content(request: RetryContentRequest):
    """重试处理内容"""
    # 从 context 中获取当前用户 ID
    user_id = context_user.get().id

    # 获取内容并验证是否属于当前用户
    content = await content_repository.get_by_uid(request.uid)
    if not content or content.user_id != user_id:
        return failed("Content not found or not owned by user")

    # 更新状态为 PENDING 并触发处理任务
    await content_repository.update_processing_status(
        content.id, ProcessingStatus.PENDING
    )

    if content.media_type == ContentMediaType.video:
        asyncio.create_task(ContentProcessor.process_youtube_content(content.id))
    elif is_audio_type(content.media_type):
        if content.media_type == ContentMediaType.spotify_audio:
            # 处理音频文件
            asyncio.create_task(ContentProcessor.process_spotify_content(content.id))
        else:
            asyncio.create_task(ContentProcessor.audio_asr(content.id))
    elif content.media_type == ContentMediaType.article:
        asyncio.create_task(ContentProcessor.process_article_content(content.id))
    elif content.media_type == ContentMediaType.twitter:
        asyncio.create_task(ContentProcessor.process_twitter_content(content.id))
    else:
        asyncio.create_task(ContentProcessor.process_file(content.id))

    return success(data=ContentResponse.model_validate(content.__dict__))


@router.post(
    "/share/{uid}",
    response_model=CommonResponse[str],
    summary="Share Content",
    description="Increment share count for a content",
)
async def share_content(uid: str):
    """分享内容"""
    content = await content_repository.get_by_uid(uid)
    if not content:
        return failed("Content not found")

    # 使用正确的 content.id（整数）调用
    await content_repository.increment_share_count(content.id)

    return success(data=get_page_url(uid))


@router.post(
    "/delete/{uid}",
    response_model=CommonResponse[ContentResponse],
    summary="Soft Delete Content",
    description="Mark content as deleted by its UID (soft delete)",
)
async def delete_content(uid: str):
    # 从 context 中获取当前用户 ID
    user_id = context_user.get().id

    # 获取内容并验证是否属于当前用户
    content = await content_repository.get_by_uid(uid)
    if not content or content.user_id != user_id:
        return failed("Content not found or not owned by user")

    # 执行软删除
    await content_repository.update(
        content_id=content.id, is_deleted=True, updated_at=datetime.utcnow()
    )

    return success(data=ContentResponse.model_validate(content.__dict__))


@router.post(
    "/view/{uid}",
    response_model=CommonResponse[Optional[str]],
    summary="Increment View Count",
    description="Increment view count for a content by its UID",
)
async def increment_view_count(uid: str):
    """增加内容浏览次数"""
    content = await content_repository.get_by_uid(uid)
    if not content:
        return failed("Content not found")

    await content_repository.increment_view_count(content.id)

    return success(data=get_page_url(uid))

def parse_subtitles(subtitles):
    """
    解析字幕数据，支持 JSON 字符串或字典列表
    :param subtitles: 字幕数据，可以是 JSON 字符串或字典列表
    :param logger: 日志记录器
    :return: SubtitleSegment 对象列表，如果解析失败返回 None
    """
    if not subtitles:
        return None
    try:
        if isinstance(subtitles, str):
            return [SubtitleSegment(**segment) for segment in json.loads(subtitles)]
        elif isinstance(subtitles, list):
            return [SubtitleSegment(**segment) for segment in subtitles]
    except Exception as e:
        logger.error(f"Failed to parse subtitles: {str(e)}")
        return None

def get_audio_duration(file_path: str) -> float:
    """
    Get the duration of an audio file in seconds by reading metadata.
    
    Args:
        file_path: Path to the audio file
        
    Returns:
        Duration in seconds as a float
    """
    try:
        # 根据文件类型使用不同的解析器
        audio = MutagenFile(file_path, easy=True)
        if audio is None:
            raise ValueError("Unsupported audio format")
        
        # 获取时长（秒）
        duration = audio.info.length
        return duration
    except Exception as e:
        logger.error(f"Failed to get audio duration: {str(e)}")
        raise ValueError("Failed to process audio file")

@router.post(
    "/copy",
    response_model=CommonResponse[dict],
    summary="Copy Contents to Current User",
    description="Copy contents from the provided UIDs to the current user's account.",
)
async def copy_contents(request: CopyContentsRequest):
    """Copy contents from the provided UIDs to the current user's account."""
    user = context_user.get()
    if not user:
        logger.error("User not found in context when attempting to copy contents")
        return failed("User not found")

    # Log the request
    logger.info(f"Copying contents with UIDs: {request.uids} for user ID: {user.id}")
    
    # Remove duplicate UIDs from the list
    original_count = len(request.uids)
    unique_uids = list(set(request.uids))
    duplicate_count = original_count - len(unique_uids)
    
    if duplicate_count > 0:
        logger.info(f"Removed {duplicate_count} duplicate UIDs from the request")
    
    if len(unique_uids) > 100:
        return failed("Too many contents provided, limiting to 100")

    try:
        contents = await content_repository.get_by_uids(unique_uids)
        if not contents:
            logger.warning(f"No contents found with UIDs: {unique_uids}")
            return failed("Contents not found")

        copied_contents = []
        skipped_count = 0
        
        for content in contents:
            # Skip if content is already owned by the current user
            if content.user_id == user.id:
                logger.info(f"Skipping content UID {content.uid} as it's already owned by user {user.id}")
                skipped_count += 1
                continue
                
            try:
                # Create a new content with a new UID, but copy the rest of the fields
                new_uid = nanoid.generate().lower()
                logger.info(f"Creating new content with UID {new_uid} based on {content.uid}")
                
                # Copy all the relevant fields from the original content
                new_content = await content_repository.create(
                    uid=new_uid,
                    source=content.source,
                    processing_status=ProcessingStatus.COMPLETED,  # Set as completed since we're copying completed content
                    is_deleted=False,
                    media_type=content.media_type,
                    file_type=content.file_type,
                    file_name_in_storage=content.file_name_in_storage,
                    batch_id=nanoid.generate().lower(),  # Generate a new batch ID
                )
                
                # Update all the fields that weren't included in the create method
                await content_repository.update(
                    content_id=new_content.id,
                    title=content.title,
                    content_hash=content.content_hash,
                    site_name=content.site_name,
                    author=content.author,
                    lang=content.lang,
                    published_time=content.published_time,
                    content=content.content or "",  # Ensure content is not None
                    cover=content.cover,
                    images=content.images,
                    text_content=content.text_content,
                    ai_summary=content.ai_summary,
                    ai_recommend_reason=content.ai_recommend_reason,
                    ai_mermaid=content.ai_mermaid,
                    ai_structure=content.ai_structure,
                    ai_tags=content.ai_tags,
                    media_seconds_duration=content.media_seconds_duration,
                    video_duration=content.video_duration,
                    video_embed_url=getattr(content, 'video_embed_url', None),
                    raw_description=getattr(content, 'raw_description', None),
                    video_subtitles=getattr(content, 'video_subtitles', None),
                    audio_subtitles=getattr(content, 'audio_subtitles', None),
                    media_subtitles=getattr(content, 'media_subtitles', None),
                    rag_status=content.rag_status,
                    dataset_doc_id=content.dataset_doc_id,
                    dataset_id=content.dataset_id
                )
                
                # Refresh the content to get the updated data
                new_content = await content_repository.get_by_id(new_content.id)
                content_dict = await process_content_dict(new_content.__dict__, logger)
                copied_contents.append(ContentResponse.model_validate(content_dict))
                logger.info(f"Successfully copied content with UID {content.uid} to new content with UID {new_uid}")
            except Exception as e:
                logger.error(f"Error copying content with UID {content.uid}: {str(e)}")
                # Continue with other contents even if one fails
                # Continue with other contents even if one fails
                continue
        
        # 准备统计数据
        result = {
            "total": original_count,
            "unique_count": len(unique_uids),
            "success_count": len(copied_contents)
        }
        
        if not copied_contents:
            if skipped_count > 0:
                logger.info(f"All {skipped_count} contents were already owned by user {user.id}")
                return failed("All contents were already owned by you.", data=result)
            else:
                logger.warning("No contents were copied due to errors")
                return failed("Failed to copy any contents. Please try again later.", data=result)
        
        logger.info(f"Successfully copied {len(copied_contents)} contents for user {user.id}")
        return success(data=result)
    except Exception as e:
        logger.error(f"Unexpected error during content copy operation: {str(e)}")
        return failed("An unexpected error occurred. Please try again later.")


@router.post(
    "/edit",
    response_model=CommonResponse[Optional[ContentResponse]],
    summary="Edit Content Fields",
    description="Edit content fields like title, AI tags, and deletion status",
)
async def edit_content(request: EditContentRequest):
    """Edit content fields"""
    # Get current user ID from context
    user = context_user.get()
    
    # Get content and verify ownership
    content = await content_repository.get_by_uid(request.uid)
    if not content or content.user_id != user.id or content.is_deleted:
        return failed("Content not found or not owned by you")
    
    # 准备知识库UIDs
    kb_uids = list(set(request.add_to_kb_ids or []))
    kbs = []
    
    # 如果有知识库UID，先验证权限
    if kb_uids and len(kb_uids) > 0:
        # 获取知识库信息
        kbs = await knowledge_base_repository.get_knowledge_bases_by_uids(kb_uids)

        if len(kbs) != len(kb_uids):
            return failed("Some of knowledge base not found or no permission")
        
        if not kbs:
            return failed("Knowledge base not found or no permission")
        
        # 检查所有知识库的所有权
        for kb in kbs:
            if kb.user_id != user.id:
                return failed("Knowledge base not found or no permission")
    
    # 准备更新字段
    update_fields = {}
    
    if request.title is not None:
        update_fields["title"] = request.title
        
    if request.tags is not None:
        update_fields["ai_tags"] = request.tags
        
    # 如果有更新字段或添加知识库
    if update_fields or request.add_to_kb_ids is not None:
        updated_content = None
        
        # 创建数据库会话并开始事务
        async with get_async_session() as session:
            try:
                # 如果有更新字段，更新内容
                if update_fields:
                    update_fields["updated_at"] = datetime.utcnow()
                    # 在事务中执行更新
                    content_update_stmt = (
                        update(Content)
                        .where(Content.id == content.id)
                        .values(**update_fields)
                        .returning(Content)
                    )
                    result = await session.execute(content_update_stmt)
                    updated_content = result.scalar_one_or_none()
                else:
                    updated_content = content

                # 如果提供了add_to_kb_ids参数（无论是否为空列表），都需要处理知识库映射
                if request.add_to_kb_ids is not None:
                    # 总是先删除所有现有关联，实现幂等性
                    existing_mappings_query = select(ContentKnowledgeBaseMapping).where(
                        and_(
                            ContentKnowledgeBaseMapping.content_id == content.id,
                            ContentKnowledgeBaseMapping.is_deleted == False
                        )
                    )
                    existing_mappings_result = await session.execute(existing_mappings_query)
                    existing_mappings = existing_mappings_result.scalars().all()
                    
                    # 将所有现有映射标记为已删除
                    for mapping in existing_mappings:
                        mapping.is_deleted = True
                        mapping.deleted_at = datetime.utcnow()
                        mapping.deleted_by = user.id
                    
                    # 只有当知识库列表不为空时，才添加新的关联
                    if kb_uids and kbs:
                        # 在事务中添加内容到知识库
                        for kb in kbs:
                            # 先检查是否存在映射（包括已删除的）
                            existing_mapping_query = select(ContentKnowledgeBaseMapping).where(
                                and_(
                                    ContentKnowledgeBaseMapping.content_id == content.id,
                                    ContentKnowledgeBaseMapping.knowledge_base_id == kb.id
                                )
                            )
                            existing_result = await session.execute(existing_mapping_query)
                            existing_mapping = existing_result.scalar_one_or_none()
                            
                            if existing_mapping:
                                # 如果映射存在但被标记为删除，则恢复它
                                if existing_mapping.is_deleted:
                                    existing_mapping.is_deleted = False
                                    existing_mapping.deleted_at = None
                                    existing_mapping.deleted_by = None
                                    existing_mapping.created_by = user.id
                            else:
                                # 如果映射不存在，创建新映射
                                new_mapping = ContentKnowledgeBaseMapping(
                                    content_id=content.id,
                                    knowledge_base_id=kb.id,
                                    created_by=user.id
                                )
                                session.add(new_mapping)
                
                # 提交事务
                await session.commit()
                
            except Exception as e:
                # 回滚事务
                await session.rollback()
                logger.error(f"Failed to update content and add to knowledge base: {str(e)}")
                return failed("Failed to update content")
        
        # 事务结束后，更新内容对象为最新状态（如果已更新）
        if updated_content and update_fields:
            content = updated_content
    
    # 事务外处理响应数据
    response_data = await process_content_dict(content.__dict__, logger)
    belonged_kbs = await knowledge_base_repository.get_knowledge_bases_by_content_or_user(content.id, user.id)
    response_data["belonged_kbs"] = [
        {"uid": kb["uid"], "name": kb["name"]} for kb in belonged_kbs
    ] if belonged_kbs else None
    
    return success(data=ContentResponse.model_validate(response_data))


@router.get(
    "/retry_youtube_transcript_get",
    response_model=CommonResponse[Optional[bool]],
    summary="Retry youtube transcript get",
)
async def retry_youtube_transcript_get(uid: str, background_tasks: BackgroundTasks):
    try:
        content = await content_repository.get_by_uid(uid)
        user = context_user.get()
        if not content or content.media_type != ContentMediaType.video or content.user_id != user.id:
            return failed("Content not found or no permission")

        # if content.media_subtitles:
        #     return success(data=True)

        # Run the transcription task in the background
        async def process_transcript_task(content_id: int):
            await YouTubeAudioFileServiceNG().retry_transcript_get(content_id)
            
        background_tasks.add_task(process_transcript_task, content.id)
        
        return success(data=True)
    except Exception as e:
        logger.error(f"Failed to retry youtube transcript get: {str(e)}")
        return failed("Failed to retry youtube transcript get")

