import httpx
import logging
from typing import Optional, Dict, Tuple
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import re
from app.api.file.file import DEFAULT_UPLOAD_PATH, storage
import os
import nanoid
import aiofiles
import tempfile
import asyncio
import aioboto3
from app import settings
import mimetypes
import subprocess
from httpx import TimeoutException, HTTPStatusError, RequestError
from app.common import retry_async

logger = logging.getLogger(__name__)

class SpotifyService:
    RAPIDAPI_HOST = "spotify23.p.rapidapi.com"
    RAPIDAPI_KEY = settings.rapidapi_key  # This should be moved to environment variables
    MAX_RETRIES = 3
    CHUNK_SIZE = 1024 * 1024  # 1MB chunks
    MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
    DOWNLOAD_TIMEOUT = 300  # 5 minutes
    MAX_REDIRECTS = 10  # Maximum number of redirects to follow
    ALLOWED_AUDIO_TYPES = {
        'audio/mpeg': '.mp3',
        'audio/mp4': '.mp4',
        'audio/aac': '.aac',
        'audio/ogg': '.ogg',
        'audio/x-m4a': '.mp4',
        'audio/mp3': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'video/mp4': '.mp4',
        'application/mp4': '.mp4',
    }
    
    @staticmethod
    def parse_spotify_url(url: str) -> tuple[bool, Optional[str]]:
        """
        Parse Spotify URL to extract episode ID.
        Returns (is_spotify_url, episode_id)
        """
        try:
            parsed_url = urlparse(url)
            if "spotify.com" not in parsed_url.netloc:
                return False, None
                
            # Extract episode ID from path
            path_parts = parsed_url.path.split('/')
            if 'episode' in path_parts:
                episode_idx = path_parts.index('episode')
                if len(path_parts) > episode_idx + 1:
                    return True, path_parts[episode_idx + 1]
            
            return False, None
        except Exception as e:
            logger.error(f"Error parsing Spotify URL: {str(e)}")
            return False, None

    @retry_async(Exception, tries=2, delay=3, backoff=2)
    async def get_episode_audio_url(self, episode_id: str) -> Optional[str]:
        """
        Get Spotify episode audio URL from RapidAPI.
        """
        url = f"https://spotify23.p.rapidapi.com/episode_sound/?id={episode_id}"
        headers = {
            "x-rapidapi-host": self.RAPIDAPI_HOST,
            "x-rapidapi-key": self.RAPIDAPI_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # First try to get the passthrough URL if available
            if data.get("passthrough") == "ALLOWED" and data.get("passthroughUrl"):
                return data["passthroughUrl"]
            
            # Otherwise get the first available URL
            if data.get("url") and isinstance(data["url"], list) and len(data["url"]) > 0:
                return data["url"][0]
                
            return None

    def _validate_audio_type(self, content_type: str) -> Optional[str]:
        """
        Validate and return file extension for allowed audio types.
        Special handling for video/mp4 which might actually be audio.
        """
        content_type = content_type.lower()
        
        # Special handling for MP4 container format
        if content_type in ['video/mp4', 'application/mp4']:
            logger.info(f"Received {content_type} content type, treating as audio/mp4")
            return '.mp4'
            
        if content_type not in self.ALLOWED_AUDIO_TYPES:
            logger.error(f"Unsupported audio type: {content_type}")
            return None
            
        return self.ALLOWED_AUDIO_TYPES[content_type]

    async def _follow_redirects(self, client: httpx.AsyncClient, url: str, method: str = 'GET', max_redirects: int = None) -> Tuple[str, dict]:
        """
        Follow HTTP redirects manually and return the final URL and headers.
        
        Args:
            client: httpx.AsyncClient instance
            url: Initial URL to request
            method: HTTP method to use
            max_redirects: Maximum number of redirects to follow (defaults to self.MAX_REDIRECTS)
            
        Returns:
            Tuple of (final_url, response_headers)
        """
        if max_redirects is None:
            max_redirects = self.MAX_REDIRECTS
            
        redirects = 0
        current_url = url
        
        while redirects < max_redirects:
            try:
                response = await client.request(method, current_url, follow_redirects=False)
                
                if response.status_code in (301, 302, 303, 307, 308):
                    redirects += 1
                    next_url = response.headers.get('location')
                    if not next_url:
                        raise ValueError(f"Received redirect status {response.status_code} but no Location header")
                        
                    # Handle relative redirects
                    if not next_url.startswith(('http://', 'https://')):
                        parsed = urlparse(current_url)
                        next_url = f"{parsed.scheme}://{parsed.netloc}{next_url}"
                    
                    logger.info(f"Following redirect {redirects}/{max_redirects}: {current_url} -> {next_url}")
                    current_url = next_url
                    continue
                    
                response.raise_for_status()
                return current_url, response.headers
                
            except (HTTPStatusError, RequestError) as e:
                logger.error(f"Error following redirect: {str(e)}")
                raise
                
        raise ValueError(f"Too many redirects (>{max_redirects})")

    async def _extract_audio_from_video(self, input_file: str) -> Optional[str]:
        """
        Extract audio from video file using ffmpeg.
        Returns the path to the extracted audio file or None if extraction fails.
        """
        try:
            # Determine output format based on input file or default to aac
            # Using .aac extension as it's commonly used in Spotify content
            audio_ext = '.wav'
            temp_audio_file = f"{input_file}_extracted{audio_ext}"
            
            # Use ffmpeg to extract audio without re-encoding (copy codec)
            ffmpeg_cmd = [
                'ffmpeg', 
                '-i', input_file, 
                '-vn',  # No video
                '-c:a', 'copy',  # Copy audio stream without re-encoding
                '-y',  # Overwrite output file if exists
                temp_audio_file
            ]
            
            # Log the ffmpeg command for debugging
            logger.info(f"Running ffmpeg command: {' '.join(ffmpeg_cmd)}")
            
            # Execute ffmpeg command asynchronously
            proc = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            if proc.returncode != 0:
                stderr_text = stderr.decode() if stderr else "Unknown error"
                logger.error(f"ffmpeg extraction failed: {stderr_text}")
                
                # If copy codec fails, try with explicit encoding as fallback
                logger.info("Trying fallback extraction with explicit encoding")
                fallback_audio_file = f"{input_file}_fallback.mp3"
                fallback_cmd = [
                    'ffmpeg', 
                    '-i', input_file, 
                    '-vn',  # No video
                    '-acodec', 'libmp3lame',  # Use MP3 codec as fallback
                    '-ar', '44100',  # Sample rate
                    '-ab', '192k',  # Bitrate
                    '-y',  # Overwrite output file if exists
                    fallback_audio_file
                ]
                
                logger.info(f"Running fallback ffmpeg command: {' '.join(fallback_cmd)}")
                fallback_proc = await asyncio.create_subprocess_exec(
                    *fallback_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                fallback_stdout, fallback_stderr = await fallback_proc.communicate()
                
                if fallback_proc.returncode != 0:
                    fallback_stderr_text = fallback_stderr.decode() if fallback_stderr else "Unknown error"
                    logger.error(f"Fallback ffmpeg extraction failed: {fallback_stderr_text}")
                    return None
                else:
                    logger.info(f"Successfully extracted audio using fallback method to {fallback_audio_file}")
                    return fallback_audio_file
            
            logger.info(f"Successfully extracted audio to {temp_audio_file}")
            return temp_audio_file
            
        except Exception as e:
            logger.error(f"Error extracting audio from video: {str(e)}")
            return None

    @retry_async(Exception, tries=2, delay=3, backoff=2)
    async def download_and_store_audio(self, audio_url: str, episode_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Download audio file and store it in storage.
        Returns (storage_path, file_type)
        """
        temp_file_path = None
        extracted_audio_path = None
        total_size = 0
        
        try:
            timeout = httpx.Timeout(self.DOWNLOAD_TIMEOUT)
            async with httpx.AsyncClient(timeout=timeout) as client:
                # First follow redirects with HEAD request to get final URL and headers
                final_url, headers = await self._follow_redirects(client, audio_url, method='GET')
                
                content_type = headers.get('content-type', 'audio/mp4')
                content_length = int(headers.get('content-length', 0))
                
                # Log the actual content type we received
                logger.info(f"Received content type from server: {content_type} for final URL: {final_url}")
                
                # Validate content type and force .mp4 extension for certain types
                file_extension = self._validate_audio_type(content_type)
                if not file_extension:
                    logger.warning(f"Unsupported audio type: {content_type}, will try to extract audio")
                    # Still assign an extension for the original download
                    file_extension = mimetypes.guess_extension(content_type) or '.bin'
                
                # Check file size
                if content_length > self.MAX_FILE_SIZE:
                    raise ValueError(f"File size ({content_length} bytes) exceeds maximum allowed size ({self.MAX_FILE_SIZE} bytes)")
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
                    temp_file_path = tmp.name
                    
                    # Create a new client with redirects enabled for the actual download
                    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, max_redirects=self.MAX_REDIRECTS) as download_client:
                        async with download_client.stream('GET', final_url) as response:
                            response.raise_for_status()
                            
                            # Double check content type from actual response
                            actual_content_type = response.headers.get('content-type', content_type)
                            if actual_content_type != content_type:
                                logger.info(f"Content type changed from {content_type} to {actual_content_type} in response")
                                file_extension = self._validate_audio_type(actual_content_type)
                                if not file_extension:
                                    logger.warning(f"Content type {actual_content_type} is not an allowed audio type, will try to extract audio")
                                    # Still assign an extension for the original download
                                    file_extension = mimetypes.guess_extension(actual_content_type) or '.bin'
                            
                            async with aiofiles.open(temp_file_path, mode='wb') as f:
                                async for chunk in response.aiter_bytes(chunk_size=self.CHUNK_SIZE):
                                    total_size += len(chunk)
                                    if total_size > self.MAX_FILE_SIZE:
                                        raise ValueError(f"File size exceeds maximum allowed size ({self.MAX_FILE_SIZE} bytes)")
                                    await f.write(chunk)
                
                # Check if we need to extract audio from a non-audio file
                # Use the content_type to determine if it's an audio file rather than just the extension
                is_video_type = actual_content_type.startswith('video/') 
                if is_video_type:
                    logger.info(f"Attempting to extract audio from non-audio content type: {actual_content_type}, file: {temp_file_path}")
                    
                    # Save the original video file locally
                    local_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../downloads')
                    os.makedirs(local_dir, exist_ok=True)
                    
                    # Extract audio
                    extracted_audio_path = await self._extract_audio_from_video(temp_file_path)
                    
                    if extracted_audio_path:
                        logger.info(f"Successfully extracted audio to {extracted_audio_path}")
                        temp_file_path = extracted_audio_path
                        file_extension = '.wav'  # We're converting to aac
                    else:
                        logger.warning("Failed to extract audio, will try to use original file")
                
                # Generate storage path
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                file_name = f"spotify_{episode_id}_{timestamp}{file_extension}"
                storage_path = os.path.join(DEFAULT_UPLOAD_PATH, f"{file_name}")
                
                # Read file and store to S3 asynchronously
                async with aiofiles.open(temp_file_path, mode='rb') as f:
                    file_content = await f.read()
                    await storage.save(storage_path, file_content)
                
                return storage_path, 'audio_micro'
                
        except TimeoutException as e:
            logger.error(f"Timeout downloading audio file: {str(e)}")
            return None, None
        except ValueError as e:
            logger.error(str(e))
            return None, None
        except Exception as e:
            logger.error(f"Error downloading and storing audio file: {str(e)}")
            return None, None
        finally:
            # Clean up temporary files
            for path in [temp_file_path, extracted_audio_path]:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except Exception as e:
                        logger.warning(f"Failed to delete temporary file {path}: {str(e)}")

    @retry_async(Exception, tries=2, delay=3, backoff=2)
    async def get_episode_info(self, episode_id: str) -> Optional[Dict]:
        """
        Get Spotify episode metadata from RapidAPI.
        """
        url = f"https://spotify23.p.rapidapi.com/episode/?id={episode_id}"
        headers = {
            "x-rapidapi-host": self.RAPIDAPI_HOST,
            "x-rapidapi-key": self.RAPIDAPI_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            if not data or "data" not in data or "episodeUnionV2" not in data["data"]:
                return None
                
            episode = data["data"]["episodeUnionV2"]
            
            # Get audio URL
            audio_url = await self.get_episode_audio_url(episode_id)
            if not audio_url:
                return None
            
            # Download and store the audio file
            storage_path, file_type = await self.download_and_store_audio(audio_url, episode_id)
            if not storage_path:
                return None
            
            # Extract relevant metadata
            published_time = None
            if episode.get("releaseDate") and episode["releaseDate"].get("isoString"):
                # Convert timezone-aware datetime to timezone-naive by extracting UTC time
                dt = datetime.fromisoformat(episode["releaseDate"]["isoString"])
                if dt.tzinfo is not None:
                    published_time = dt.astimezone(timezone.utc).replace(tzinfo=None)
                else:
                    published_time = dt
            
            metadata = {
                "title": episode.get("name"),
                "description": episode.get("description"),
                "html_description": episode.get("htmlDescription"),
                "duration": episode["duration"]["totalMilliseconds"] / 1000 if episode.get("duration") else None,
                "cover": next((source["url"] for source in episode["coverArt"]["sources"] if source["width"] == 640), None) if episode.get("coverArt") else None,
                "published_time": published_time,
                "storage_path": storage_path,
                "file_type": file_type,
                "podcast_name": episode["podcastV2"]["data"]["name"] if episode.get("podcastV2") and episode["podcastV2"].get("data") else None
            }
            
            return metadata

spotify_service = SpotifyService()
