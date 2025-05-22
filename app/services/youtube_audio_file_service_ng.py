import logging
import os
import json
import time
import asyncio
import urllib.parse
import hashlib
import nanoid
import re
from typing import Dict, Any, List, Optional, TypedDict, Literal, Union
from app.config import settings
from app.database.models.content import ProcessingStatus
from app.database.repositories.content_repository import content_repository
from app.services.content_processor import ContentProcessor
from app.services.youtube_service import YouTubeService
import aiohttp
from app.api.file.file import upload_file_size_is_valid, upload_file_type_is_valid, DEFAULT_UPLOAD_PATH, \
    storage
from app.workers import rag as rag_worker
from app.workers import content as content_worker

logger = logging.getLogger(__name__)


class AudioFileResponseSuccess(TypedDict):
    """Successful audio file response."""
    linkDownload: str
    linkDownloadProgress: str


class AudioFileResponseProcessing(TypedDict):
    """Processing audio file response."""
    status: Literal["in_progress"]
    progress: int
    elapsed_time: float
    estimated_time: float
    ext: str
    quality: str
    video_id: str


class AudioFileResponseCompleted(TypedDict):
    """Completed audio file response."""
    status: Literal["success"]
    download_url: str
    file_path: str
    file_info: Dict[str, Any]


class AudioFileResponseError(TypedDict):
    """Error audio file response."""
    status: Literal["error"]
    msg: str


AudioFileResponse = Union[AudioFileResponseSuccess, AudioFileResponseProcessing, AudioFileResponseCompleted, AudioFileResponseError]


class YouTubeAudioFileServiceNG:
    """Service to download audio files from YouTube videos using the new RapidAPI endpoint."""
    
    def __init__(self):
        """Initialize the YouTube Audio File Service."""
        self.api_key = settings.rapidapi_key
        self.api_host = "youtube-mp3-2025.p.rapidapi.com"
        self.base_url = "https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio"
        
    async def _make_initial_request(self, video_id: str) -> AudioFileResponse:
        """Make an async request to the RapidAPI endpoint.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary containing response from API with typed structure
        """
        headers = {
            "x-rapidapi-host": self.api_host,
            "x-rapidapi-key": self.api_key
        }
        
        params = {
            "id": video_id,
            "ext": "m4a",
            "quality": "128kbps"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, headers=headers, params=params) as response:
                    response.raise_for_status()
                    data = await response.json()
                    
                    return AudioFileResponseSuccess(
                        linkDownload=data.get("linkDownload", ""),
                        linkDownloadProgress=data.get("linkDownloadProgress", "")
                    )
                    
        except aiohttp.ClientError as e:
            return AudioFileResponseError(
                status="error",
                msg=f"Request failed: {str(e)}"
            )
        except json.JSONDecodeError:
            return AudioFileResponseError(
                status="error",
                msg="Failed to decode JSON response"
            )

    async def _check_progress(self, progress_url: str) -> AudioFileResponse:
        """Check the progress of audio processing.
        
        Args:
            progress_url: URL to check progress
            
        Returns:
            Progress information or completion status
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(progress_url) as response:
                    response.raise_for_status()
                    
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if not line:
                            continue
                            
                        # Parse SSE format
                        if line.startswith('data:'):
                            try:
                                data = json.loads(line[5:])
                                
                                if data.get('status') == 'in_progress':
                                    return AudioFileResponseProcessing(
                                        status="in_progress",
                                        progress=data.get('progress', 0),
                                        elapsed_time=data.get('elapsed_time', 0.0),
                                        estimated_time=data.get('estimated_time', 0.0),
                                        ext=data.get('ext', ''),
                                        quality=data.get('quality', ''),
                                        video_id=data.get('video_id', '')
                                    )
                                elif data.get('status') == 'success':
                                    return AudioFileResponseCompleted(
                                        status="success",
                                        download_url=data.get('download_url', ''),
                                        file_path=data.get('file_path', ''),
                                        file_info=data.get('file_info', {})
                                    )
                                elif data.get('status') == 'error':
                                    return AudioFileResponseError(
                                        status="error",
                                        msg=data.get('msg', 'Unknown error from server')
                                    )
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse SSE data: {line}")
                                continue
                            
        except Exception as e:
            logger.error(f"SSE connection error: {str(e)}")
            return AudioFileResponseError(
                status="error",
                msg=f"SSE connection failed: {str(e)}"
            )

    async def get_audio_file(self, video_id: str, max_retries: int = 3, retry_delay: int = 1) -> AudioFileResponse:
        """Get audio file data from YouTube video asynchronously.
        
        Args:
            video_id: YouTube video ID
            max_retries: Maximum number of times to retry on connection failure
            retry_delay: Delay in seconds between retry attempts
            
        Returns:
            AudioFileResponse with the appropriate structure based on the status
        """
        # Initial request to get download links
        initial_response = await self._make_initial_request(video_id)
        
        if initial_response.get('status') == 'error':
            return initial_response
            
        progress_url = initial_response.get('linkDownloadProgress')
        if not progress_url:
            return AudioFileResponseError(
                status="error",
                msg="No progress URL provided"
            )
            
        # Retry only when SSE connection fails
        retries = 0
        while retries <= max_retries:
            try:
                progress_response = await self._check_progress(progress_url)
                
                # Check response status instead of using isinstance
                status = progress_response.get('status')
                
                if status == 'error':
                    if retries < max_retries:
                        retries += 1
                        await asyncio.sleep(retry_delay)
                        continue
                    return progress_response
                    
                if status == 'success':
                    return progress_response
                    
                if status == 'in_progress':
                    # If still processing, immediately try again without counting as retry
                    continue
                    
            except Exception as e:
                if retries < max_retries:
                    retries += 1
                    await asyncio.sleep(retry_delay)
                    continue
                return AudioFileResponseError(
                    status="error",
                    msg=f"Failed to check progress after {max_retries} retries: {str(e)}"
                )
            
        return AudioFileResponseError(
            status="error",
            msg=f"Max retries ({max_retries}) reached while checking progress"
        )
    
    async def retry_transcript_get(self, content_id: int):
        """Run audio file retrieval for a YouTube URL and process with FAL.
        
        Args:
            content_id: ID of the content to process
            
        Returns:
            Dictionary containing processed audio information or error
        """
        try:
            content = await content_repository.get_by_id(content_id)

            await content_repository.update(
                content_id=content.id,
                processing_status=ProcessingStatus.PENDING,
            )
            
            is_youtube, video_id = YouTubeService.parse_youtube_url(content.source)

            if not is_youtube:
                logger.error(f"Invalid YouTube URL: {content.source}")
                await content_repository.update(
                    content_id=content.id,
                    processing_status=ProcessingStatus.COMPLETED,
                )
                return {"status": "error", "msg": "Invalid YouTube URL"}
            
            res = await self.get_audio_file(video_id)
            
            # Check response status instead of using isinstance
            if res.get('status') == 'success':
                download_url = res.get('download_url')
                file_info = res.get('file_info', {})
                
                if not download_url:
                    logger.error("No download URL found in response")
                    await content_repository.update(
                        content_id=content.id,
                        processing_status=ProcessingStatus.COMPLETED,
                    )
                    return {"status": "error", "msg": "No download URL found"}
                
                # Generate filename from file_info or create a new one
                filename = file_info.get('name') or f"{nanoid.generate().lower()}.m4a"
                
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(download_url) as response:
                            response.raise_for_status()
                            file_content = await response.read()
                            
                            # Generate a unique path for storage
                            timestamp = int(time.time())
                            # file_hash_prefix = hashlib.md5(f"{content_id}{timestamp}".encode()).hexdigest()[:8]
                            # new_file_name = f"{file_hash_prefix}-{filename}"
                            ext = os.path.splitext(filename)[1] if '.' in filename else '.m4a'
                            new_file_name = f"{nanoid.generate().lower()}{ext}"
                            uri = os.path.join(DEFAULT_UPLOAD_PATH, f"{new_file_name}")
                            
                            # Save the file to storage
                            await storage.save(uri, file_content)
                            
                            # Get the URL for the stored file
                            stored_url = storage.get_url(uri)
                            
                            # Process the audio with FAL
                            processed_result = await ContentProcessor.process_audio_with_fal(
                                audio_url=stored_url,
                            )
                            
                            # Update the content with transcription
                            await content_repository.update(
                                content_id=content.id,
                                media_subtitles=processed_result,
                                processing_status=ProcessingStatus.COMPLETED,
                            )

                            content_worker.content_ai_process.delay(content_id)
                            rag_worker.rag_process.delay(content_id)
                
                except aiohttp.ClientError as e:
                    logger.error(f"Error downloading audio file: {str(e)}")
                    await content_repository.update(
                        content_id=content.id,
                        processing_status=ProcessingStatus.COMPLETED,
                    )
            else:
                logger.error(f"Failed to get audio file: {res.get('msg', 'Unknown error')}")
                await content_repository.update(
                    content_id=content.id,
                    processing_status=ProcessingStatus.COMPLETED,
                )
                
        except Exception as e:
            logger.error(f"Error processing audio file: {str(e)}")
            await content_repository.update(
                content_id=content.id,
                processing_status=ProcessingStatus.COMPLETED,
            )
