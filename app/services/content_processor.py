import hashlib
import logging
from datetime import datetime
import base64
import asyncio
import urllib.parse
from typing import Any, Optional

import fal_client
from app.config import StorageType
from app.database.repositories.content_repository import content_repository
from app.libs.doc_parser.index import DocParser
from app.libs.llm.content import get_image_caption
from app.services.youtube_service import YouTubeService, YouTubeVideoInfo
from app.workers import content as content_worker
from app.workers import rag as rag_worker
from app.database.models.content import ProcessingStatus, ContentMediaType
from app.api.file.file import storage
import tempfile
import os
import aiofiles
import aiofiles.os as aios
import nanoid
import httpx
from docx import Document
import markdown  # 导入 markdown 库
from app import settings
from app.services.notification_service import NotificationService
from app.services.spotify_service import spotify_service
from app.services.twitter import TwitterService

logger = logging.getLogger(__name__)

FAL_SUPPORTED_LANGUAGES = ['af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'yue', 'zh']

class ContentProcessor:
    @staticmethod
    async def _handle_processing_failure_with_notification(content_id: int, error: Exception):
        """统一处理失败逻辑"""
        logger.error(f"Failed to process content {content_id}: {str(error)}")
        try:
            # 更新状态
            await content_repository.update_processing_status(
                content_id, ProcessingStatus.FAILED
            )
            # 发送通知
            await NotificationService().notify_content_status(content_id)
        except Exception as e:
            logger.error(f"Error in failure handling for content {content_id}: {str(e)}")
        finally:
            # 继续抛出原始异常
            raise error

    @staticmethod
    async def process_audio_with_fal(audio_url: str, language: Optional[str] = None) -> list:
        """
        使用FAL处理音频并返回格式化的字幕结果
        
        Args:
            audio_url: 音频URL
            language: 音频语言代码，如果提供且支持则会传递给FAL
            
        Returns:
            list: 标准化的字幕列表，每个元素包含 start, duration, text
        """
        # 1. 准备参数
        arguments = {
            "audio_url": audio_url,
        }
        
        # 如果提供了语言且该语言受支持，则添加到参数中
        if language and language in FAL_SUPPORTED_LANGUAGES:
            arguments["language"] = language
        elif language:
            logger.warning(f"Language not supported by FAL: {language}")

        # 2. 提交到FAL进行处理
        handler = await fal_client.submit_async(
            "fal-ai/wizper",
            arguments=arguments,
        )
        
        # 3. 获取处理结果
        result = await handler.get()
        
        # 4. 处理结果为标准格式
        # Ensure chunks exist and is a list
        chunks = result.get("chunks", [])
        if not isinstance(chunks, list):
            logger.error(f"Invalid chunks format: {type(chunks)}")
            raise ValueError("Invalid chunks format")

        # Process subtitles with error handling
        audio_subtitles = []
        for chunk in chunks:
            try:
                # Ensure timestamp exists and has at least 2 values
                if not isinstance(chunk.get('timestamp'), (list, tuple)) or len(chunk['timestamp']) < 2:
                    logger.warning(f"Invalid timestamp format in chunk: {chunk}")
                    continue
                    
                audio_subtitles.append({
                    'start': round(float(chunk['timestamp'][0]), 2),
                    'duration': round(float(chunk['timestamp'][1] - chunk['timestamp'][0]), 2),
                    'text': str(chunk.get('text', ''))  # Ensure text is string
                })
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing chunk: {e}, chunk: {chunk}")
                continue
                

        return audio_subtitles

    @staticmethod
    async def audio_asr(content_id: int):
        """异步处理音频内容任务"""
        try:
            content = await content_repository.get_by_id(content_id)
            logger.info(f"Processing file, content url is: {content.source}")
            
            # 延迟 500 毫秒
            await asyncio.sleep(0.5)
            
            if not content:
                return
            
            # 获取文件URL
            file_url = storage.get_url(content.file_name_in_storage)

            # 如果 storage_type 为 local，将文件转换为 base64
            if settings.storage_type == StorageType.LOCAL:
                # 根据文件扩展名获取 MIME 类型
                file_extension = os.path.splitext(content.file_name_in_storage)[1].lower()
                mime_type = {
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.aac': 'audio/aac',
                    '.ogg': 'audio/ogg',
                    '.flac': 'audio/flac',
                }.get(file_extension, 'application/octet-stream')

                # 下载文件并转换为 base64
                async with httpx.AsyncClient() as client:
                    response = await client.get(file_url)
                    response.raise_for_status()
                    audio_data = response.content
                    base64_audio = base64.b64encode(audio_data).decode('utf-8')

                audio_url = f"data:{mime_type};base64,{base64_audio}"
            else:
                audio_url = file_url

            # 使用合并后的函数一次性处理音频并获取结果
            audio_subtitles = await ContentProcessor.process_audio_with_fal(
                audio_url=audio_url,
                language=content.lang
            )

            await content_repository.update(
                content_id,
                media_subtitles=audio_subtitles,
                processing_status=ProcessingStatus.COMPLETED,
            )

            content_worker.content_ai_process.delay(content_id)
            rag_worker.rag_process.delay(content_id)

            
        except Exception as e:
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

    @staticmethod
    async def process_file(content_id: int):
        """异步处理文件任务"""
        try:
            content = await content_repository.get_by_id(content_id)

            logger.info(f"Processing file, content url is: {content.source}")
            
            # 延迟 500 毫秒
            await asyncio.sleep(0.5)
            
            if not content:
                return
            
            # 获取文件URL
            file_url = storage.get_url(content.file_name_in_storage)

            # 创建临时文件路径
            if content.media_type != ContentMediaType.image:
                temp_file_path = f"/tmp/{nanoid.generate()}{os.path.splitext(content.file_name_in_storage)[1]}"

                try:
                    # 异步下载文件
                    async with httpx.AsyncClient() as client:
                        response = await client.get(file_url)
                        response.raise_for_status()
                        
                        # 异步写入文件
                        async with aiofiles.open(temp_file_path, 'wb') as temp_file:
                            await temp_file.write(response.content)

                    # 检查是否为 docx 文件，并尝试保存为新版本
                    if temp_file_path.lower().endswith('.docx'):
                        try:
                            doc = Document(temp_file_path)
                            new_temp_file_path = f"/tmp/{nanoid.generate()}.docx"  # 创建新的临时文件路径
                            doc.save(new_temp_file_path)
                            await aios.remove(temp_file_path) # 删除旧文件
                            temp_file_path = new_temp_file_path # 更新文件路径
                            logger.info("docx file saved as new version.")
                        except Exception as docx_e:
                            logger.warning(f"Failed to save docx as new version: {docx_e}")
                            # 如果保存新版本失败，仍然使用原始文件继续处理

                    # 使用临时文件路径进行处理
                    doc_parser = DocParser()
                    parse_result = await doc_parser.parse(temp_file_path)

                    logger.info(f"File processed, content length: {len(parse_result.text_content)}")

                    # 如果内容类型不是 PDF，将 Markdown 转换为 HTML
                    if content.media_type != ContentMediaType.pdf and parse_result.markdown:
                        html_content = markdown.markdown(parse_result.markdown)  # 将 Markdown 转换为 HTML
                    else:
                        html_content = None  # PDF 文件不需要转换

                    await content_repository.update(
                        content_id,
                        text_content=parse_result.text_content if parse_result.text_content else None,  # 空字符串时存入 null
                        content=html_content,  # 添加 HTML 内容
                        content_hash=ContentProcessor.generate_content_hash(parse_result.text_content),
                        processing_status=ProcessingStatus.COMPLETED,
                    )
                    
                    content_worker.content_ai_process.delay(content_id)
                    rag_worker.rag_process.delay(content_id)
                except Exception as e:
                    logger.error(f"Failed to process file 123: {e}")
                    # await ContentProcessor._handle_processing_failure_with_notification(content_id, e)
                finally:
                    # 异步删除临时文件
                    if await aios.path.exists(temp_file_path):
                        await aios.remove(temp_file_path)
                    # 在 finally 块中，如果 new_temp_file_path 存在，也删除它
                    if 'new_temp_file_path' in locals() and await aios.path.exists(new_temp_file_path):
                        await aios.remove(new_temp_file_path)
            else:
                image_caption = await get_image_caption(file_url)

                if not image_caption:
                    raise Exception("Failed to get image caption")

                await content_repository.update(
                    content_id,
                    text_content=image_caption.content,  # 空字符串时存入 null
                    content=image_caption.content,  # 添加 HTML 内容
                    content_hash=ContentProcessor.generate_content_hash(image_caption.content),
                    processing_status=ProcessingStatus.COMPLETED,
                    title=image_caption.title,
                    image_ocr = image_caption.ocr_result,
                    cover=file_url,
                )
                
                content_worker.content_ai_process.delay(content_id)
                rag_worker.rag_process.delay(content_id)
        except Exception as e:
            logger.error(f"Failed to process file: {e}")
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

    @staticmethod
    async def process_youtube_content(content_id: int):
        """异步处理 YouTube 视频内容任务"""
        try:
            content = await content_repository.get_by_id(content_id)
            logger.info(f"Processing YouTube content, content url is: {content.source}")
            if not content:
                return

            is_youtube_url, youtube_id = YouTubeService.parse_youtube_url(content.source)

            youtube_service = YouTubeService()
            video_info = await youtube_service.get_video_info(youtube_id)

            if not video_info:
                logger.error(f"Failed to get YouTube video info for ID: {youtube_id}")
                await ContentProcessor._handle_processing_failure_with_notification(content_id, Exception(f"Failed to get YouTube video info for ID: {youtube_id}"))
                return

            video_info = YouTubeVideoInfo(**video_info) if isinstance(video_info, dict) else video_info

            await content_repository.update(
                content_id,
                title=video_info.title,
                site_name="YouTube",
                author=video_info.channel_title,
                published_time=datetime.fromisoformat(video_info.publishedAt.replace("Z", "+00:00")).replace(tzinfo=None) 
                    if video_info.publishedAt else None,
                processing_status=ProcessingStatus.COMPLETED,
                cover=video_info.thumbnail_url,
                media_type=ContentMediaType.video,
                media_subtitles=video_info.transcript,
                media_seconds_duration=video_info.duration,
                video_embed_url=video_info.videoEmbedUrl,
                raw_description=video_info.description,
            )

            content_worker.content_ai_process.delay(content_id)
            rag_worker.rag_process.delay(content_id)

        except Exception as e:
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

    @staticmethod
    async def process_article_content(content_id: int):
        """异步处理文章内容任务"""
        try:
            content = await content_repository.get_by_id(content_id)
            logger.info(f"Processing content, content url is: {content.source}")
            if not content:
                return

            logger.info(f"Parsing URL: {content.source}")
            parsed_data = await ContentProcessor.parse_url_with_readability(content.source)
            logger.info(f"Parsed data: {parsed_data.get('title')}")

            await content_repository.update(
                content_id,
                title=parsed_data.get("title", content.title),
                content=parsed_data.get("content", ""),
                content_hash=ContentProcessor.generate_content_hash(parsed_data.get("content", "")),
                site_name=parsed_data.get("siteName", content.site_name),
                author=parsed_data.get("byline", content.author),
                lang=parsed_data.get("lang", content.lang),
                published_time=parsed_data.get("publishedTime", content.published_time),
                processing_status=ProcessingStatus.COMPLETED,
                cover=parsed_data.get("cover", content.cover),
                images=parsed_data.get("images", content.images),
                text_content=parsed_data.get("textContent", content.text_content),  # 完全移除换行符
            )

            content_worker.content_ai_process.delay(content_id)
            rag_worker.rag_process.delay(content_id)

        except Exception as e:
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

    @staticmethod
    async def parse_url_with_readability(url: str) -> dict:
        """调用本地服务解析 URL"""
        logger.info(
            f"Calling content parser service to parse URL: {settings.content_parser_url}/api/extract"
        )
        timeout = httpx.Timeout(60.0 * 2)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"{settings.content_parser_url}/api/extract",
                params={"url": url},
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    def generate_content_hash(content: str) -> str:
        """生成内容哈希"""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @staticmethod
    async def process_spotify_content(content_id: int):
        """Process Spotify podcast content"""
        try:
            content = await content_repository.get_by_id(content_id)
            logger.info(f"Processing Spotify content, content url is: {content.source}")
            if not content:
                return

            _, episode_id = spotify_service.parse_spotify_url(content.source)

            if not episode_id:
                logger.error(f"Failed to get Spotify episode ID from URL: {content.source}")
                await ContentProcessor._handle_processing_failure_with_notification(content_id, Exception(f"Failed to get Spotify episode ID from URL: {content.source}"))
                return

            episode_info = await spotify_service.get_episode_info(episode_id)

            if not episode_info:
                logger.error(f"Failed to get Spotify episode info for ID: {episode_id}")
                await ContentProcessor._handle_processing_failure_with_notification(content_id, Exception(f"Failed to get Spotify episode info for ID: {episode_id}"))
                return
            
            await content_repository.update(
                content_id,
                title=episode_info["title"],
                site_name="Spotify",
                author=episode_info["podcast_name"],
                published_time=episode_info["published_time"],
                processing_status=ProcessingStatus.PENDING,
                cover=episode_info["cover"],
                media_type=ContentMediaType.spotify_audio,
                media_seconds_duration=episode_info["duration"],
                # content=episode_info["html_description"] or episode_info["description"] or "",
                # text_content=episode_info["description"] or "",
                file_name_in_storage=episode_info["storage_path"],
                file_type=episode_info["file_type"],
                raw_description=episode_info["html_description"]
            )

            asyncio.create_task(ContentProcessor.audio_asr(content.id))

            content_worker.content_ai_process.delay(content_id)
            rag_worker.rag_process.delay(content_id)
        except Exception as e:
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

    @staticmethod
    async def process_twitter_content(content_id: int):
        """异步处理 Twitter 线程内容任务"""
        try:
            content = await content_repository.get_by_id(content_id)
            logger.info(f"Processing Twitter content, content url is: {content.source}")
            if not content:
                return
            twitter_service = TwitterService()
            twitter_data = await twitter_service.process_twitter_url(content.source)
            await content_repository.update(
                content_id,
                title=twitter_data.get("title"),
                content=twitter_data.get("content"),
                author=twitter_data.get("author"),
                lang=twitter_data.get("lang"),
                published_time=twitter_data.get("published_time"),
                cover=twitter_data.get("cover"),
                images=twitter_data.get("images"),
                text_content=twitter_data.get("text_content"),
                processing_status=ProcessingStatus.COMPLETED,
            )
            content_worker.content_ai_process.delay(content_id)
            rag_worker.rag_process.delay(content_id)
        except Exception as e:
            await ContentProcessor._handle_processing_failure_with_notification(content_id, e)

