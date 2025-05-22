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
    link: str
    title: str
    progress: int
    duration: float
    status: Literal["ok"]
    msg: Literal["success"]


class AudioFileResponseProcessing(TypedDict):
    """Processing audio file response."""
    status: Literal["processing"]
    msg: str


class AudioFileResponseError(TypedDict):
    """Error audio file response."""
    status: Literal["error"]
    msg: str


AudioFileResponse = Union[AudioFileResponseSuccess, AudioFileResponseProcessing, AudioFileResponseError]


class YouTubeAudioFileService:
    """Service to download audio files from YouTube videos using RapidAPI."""
    
    def __init__(self):
        """Initialize the YouTube Audio File Service."""
        self.api_key = settings.rapidapi_key 
        self.api_host = "youtube-mp36.p.rapidapi.com"
        self.base_url = "https://youtube-mp36.p.rapidapi.com/dl"
        
    async def _make_request(self, video_id: str) -> AudioFileResponse:
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
        
        url = f"{self.base_url}?id={video_id}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    response.raise_for_status()
                    data = await response.json()
                    
                    # Validate response structure
                    if data.get("status") == "ok" and data.get("msg") == "success":
                        return AudioFileResponseSuccess(
                            link=data.get("link", ""),
                            title=data.get("title", ""),
                            progress=data.get("progress", 0),
                            duration=data.get("duration", 0.0),
                            status="ok",
                            msg="success"
                        )
                    elif data.get("status") == "processing":
                        return AudioFileResponseProcessing(
                            status="processing",
                            msg=data.get("msg", "Processing in progress")
                        )
                    else:
                        return AudioFileResponseError(
                            status="error",
                            msg=data.get("msg", "Unknown error")
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
    
    async def get_audio_file(self, video_id: str, max_retries: int = 50, retry_delay: int = 3) -> AudioFileResponse:
        """Get audio file data from YouTube video asynchronously.
        
        Args:
            video_id: YouTube video ID
            max_retries: Maximum number of times to poll for results
            retry_delay: Delay in seconds between retry attempts
            
        Returns:
            AudioFileResponse with one of the following structures:
            
            Success:
            {
                "link": str,           # Download link
                "title": str,          # Video title
                "progress": int,       # Download progress (0-100)
                "duration": float,     # Audio duration in seconds
                "status": "ok",        # Status indicator
                "msg": "success"       # Status message
            }
            
            Processing:
            {
                "status": "processing", # Status indicator
                "msg": str              # Status message
            }
            
            Error:
            {
                "status": "error",      # Status indicator
                "msg": str              # Error message
            }
        """
        response = await self._make_request(video_id)
        
        # If status is 'processing', poll until complete or max retries reached
        retries = 0
        while response.get("status") == "processing" and retries < max_retries:
            await asyncio.sleep(retry_delay)
            response = await self._make_request(video_id)
            retries += 1
        
        return response
    
    async def retry_transcript_get(self, content_id: int):
        """Run audio file retrieval for a YouTube URL and process with FAL.
        
        Args:
            content_id: ID of the content to process
            
        Returns:
            Dictionary containing processed audio information or error
        """
        # Update the processing status immediately
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
            
            # Only process with FAL if we have a successful response
            if res.get("status") == "ok" and res.get("msg") == "success":
                # Get the audio URL
                audio_url = res.get("link", "")
                if not audio_url:
                    logger.error("No audio URL found in response")
                    await content_repository.update(
                        content_id=content.id,
                        processing_status=ProcessingStatus.COMPLETED,
                    )
                    return {"status": "error", "msg": "No audio URL found"}
                
                # Try to extract filename from URL
                filename = self._extract_filename_from_url(audio_url)
                if not filename:
                    # Generate a filename if extraction failed
                    filename = f"{nanoid.generate().lower()}.mp3"
                
                # Download the audio file
                try:
                    asyncio.sleep(2)
                    async with aiohttp.ClientSession() as session:
                        async with session.get(audio_url) as response:
                            response.raise_for_status()
                            file_content = await response.read()
                            
                            # Generate a unique path for storage
                            timestamp = int(time.time())
                            file_hash_prefix = hashlib.md5(f"{content_id}{timestamp}".encode()).hexdigest()[:8]
                            new_file_name = f"{file_hash_prefix}-{filename}"
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
    
    def _extract_filename_from_url(self, url: str) -> Optional[str]:
        """Extract a filename from the URL.
        
        Args:
            url: The URL to extract the filename from
            
        Returns:
            The extracted filename or None if extraction failed
        """
        # Try to extract filename from URL
        if url:
            # Method 1: Try to find filename at the end of the path
            path = urllib.parse.urlparse(url).path
            basename = os.path.basename(path)
            if basename and "." in basename:
                return basename
            
            # Method 2: Look for common patterns in the URL
            # Example: https://cdn02.ytjar.xyz/get.php/6/29/UxxajLWwzqY.mp3?h=...
            mp3_match = re.search(r'/([^/]+\.mp3)', url)
            if mp3_match:
                return mp3_match.group(1)
            
            # Method 3: Check for filename in query parameter 'n'
            # Example: ?n=Icona-Pop-I-Love-It-feat-Charli-XCX-OFFICIAL-VIDEO
            parsed_url = urllib.parse.urlparse(url)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            if 'n' in query_params and query_params['n'][0]:
                filename = query_params['n'][0]
                # Make sure it has an extension
                if not filename.endswith('.mp3'):
                    filename += '.mp3'
                return filename
                
        return None
