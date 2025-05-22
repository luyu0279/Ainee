import logging
import googleapiclient.discovery
from typing import Optional, Dict, Tuple
from urllib.parse import urlparse, parse_qs, unquote
import isodate
from pydantic import BaseModel
import aiohttp
import re
from xml.etree import ElementTree as ET
import json
from app.common import merge_subtitles
from app.config import settings
from google.oauth2 import service_account
from googleapiclient.discovery import build
import html  # 添加导入
from youtube_transcript_api import YouTubeTranscriptApi

logger = logging.getLogger(__name__)


class YouTubeVideoInfo(BaseModel):
    """YouTube 视频信息的 Pydantic 模型"""
    title: Optional[str] = None
    channel_title: Optional[str] = None
    duration: Optional[float] = None
    thumbnail_url: Optional[str] = None
    publishedAt: Optional[str] = None
    videoEmbedUrl: Optional[str] = None
    description: Optional[str] = None
    transcript: Optional[list] = None,
    duration: Optional[float] = None,

    class Config:
        # 允许使用字段别名
        allow_population_by_field_name = True


class CookieManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.cookies = {}
        return cls._instance

    def initialize_from_string(self, cookie_string: str):
        """
        从 cookie 字符串初始化 cookie 字典（仅在 cookies 为空时初始化）

        Args:
            cookie_string: 完整的 cookie 字符串，例如：
                "PREF=f6=40000000&f7=4100; YSC=D4ZyiMX14Ko; VISITOR_INFO1_LIVE=JzjOqQdYPxQ"
        """
        if not cookie_string or self.cookies:
            return  # 如果 cookie 字符串为空或 cookies 已有值，则跳过初始化

        # 解析 cookie 字符串
        for cookie in cookie_string.split('; '):
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                self.cookies[key] = value

    def update_cookies(self, new_cookies: str):
        """更新 cookie 字典"""
        for cookie in new_cookies.split(', '):
            if ';' in cookie:
                cookie_part = cookie.split(';')[0]
                if '=' in cookie_part:
                    key, value = cookie_part.split('=', 1)
                    self.cookies[key] = value

    def get_cookie_header(self) -> str:
        """获取当前 cookie 头"""
        return '; '.join(f"{k}={v}" for k, v in self.cookies.items())


class YouTubeService:
    def __init__(self):
        # 初始化 YouTube API 客户端
        self.api_key = settings.google_client_api_key
        self.cookie_manager = CookieManager()  # 获取单例实例
        self.cookie_manager.initialize_from_string(settings.youtube_caption_cookie)

    @staticmethod
    def parse_youtube_url(url: str) -> Optional[Tuple[bool, str]]:
        """
        解析 YouTube URL，判断是否是 YouTube 视频并提取视频 ID

        Args:
            url: 要解析的 URL

        Returns:
            Optional[Tuple[bool, str]]: 
                - 第一个元素表示是否是 YouTube 视频
                - 第二个元素是视频 ID（如果不是 YouTube 视频则为 None）
        """
        if "youtube.com" in url or "youtu.be" in url:
            if "youtube.com" in url:
                query = urlparse(url).query
                params = parse_qs(query)
                video_id = params.get("v", [None])[0]
            else:
                video_id = urlparse(url).path[1:]
            return True, video_id
        return False, None
    

    async def get_caption_self_made(self, video_id: str, default_lang: str = 'en') -> Optional[Dict[str, any]]:
        """
        异步获取并解析 YouTube 视频的字幕信息，包含详细的请求头

        Args:
            video_id: YouTube 视频 ID
            default_lang: 首选语言代码 (默认: "en")

        Returns:
            Optional[Dict[str, any]]: 
                - 包含字幕信息的字典
                - 如果视频没有字幕或出错则返回 None
        """
        try:
            headers = {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en,en-GB;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,ja;q=0.5,zh-CN;q=0.4',
                'b': 'VISITOR_INFO1_LIVE=JzjOqQdYPxQ; VISITOR_PRIVACY_METADATA=CgJTRxIEGgAgRw%3D%3D; PREF=f6=40000000&f7=4100&tz=Asia/Shanghai&f4=4000000; YSC=D4ZyiMX14Ko; VISITOR_INFO1_LIVE=JzjOqQdYPxQ; VISITOR_PRIVACY_METADATA=CgJTRxIEGgAgRw%3D%3D; __Secure-ROLLOUT_TOKEN=CLbIwM2b4-v1MRD-su7gt82LAxin4om5g_2LAw%3D%3D; GPS=1',
                'priority': 'u=0, i',
                'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                'sec-ch-ua-arch': '"arm"',
                'sec-ch-ua-bitness': '"64"',
                'sec-ch-ua-form-factors': '"Desktop"',
                'sec-ch-ua-full-version': '"133.0.6943.142"',
                'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Google Chrome";v="133.0.6943.142", "Chromium";v="133.0.6943.142"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-model': '""',
                'sec-ch-ua-platform': '"macOS"',
                'sec-ch-ua-platform-version': '"15.0.0"',
                'sec-ch-ua-wow64': '?0',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'service-worker-navigation-preload': 'true',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'x-browser-channel': 'stable',
                'x-browser-copyright': 'Copyright 2025 Google LLC. All rights reserved.',
                'x-browser-year': '2025',
                'cookie': self.cookie_manager.get_cookie_header()  # 使用当前 cookie
            }

            async with aiohttp.ClientSession() as session:
                # 获取视频页面内容
                url = f"https://www.youtube.com/watch?v={video_id}"
                async with session.get(url, headers=headers) as response:
                    response.raise_for_status()
                    
                    # 更新 cookie
                    if 'Set-Cookie' in response.headers:
                        # 获取所有 Set-Cookie 头（可能是多个）
                        set_cookie_headers = response.headers.getall('Set-Cookie', [])
                        for set_cookie in set_cookie_headers:
                            self.cookie_manager.update_cookies(set_cookie)
                        # 更新 headers 中的 cookie
                        headers['cookie'] = self.cookie_manager.get_cookie_header()
                    
                    html_content = await response.text()

                # 提取字幕信息
                captions_data = re.search(r'"captions":({.*?}),"videoDetails"', html_content)
                if not captions_data:
                    return None

                # 正确处理 JSON 字符串中的转义字符
                captions_json = captions_data.group(1).replace("\\n", "")  # 只移除 \n，保留其他转义字符
                captions_info = json.loads(captions_json)

                # 获取字幕轨道
                caption_tracks = captions_info['playerCaptionsTracklistRenderer']['captionTracks']

                # 通过 default_lang 查找匹配的字幕轨道
                selected_track = None
                for track in caption_tracks:
                    if track.get('languageCode') == default_lang:
                        selected_track = track
                        break

                # 如果没有找到匹配的，选择第一条字幕轨道
                if not selected_track and caption_tracks:
                    selected_track = caption_tracks[0]

                if not selected_track:
                    return None

                # 处理 baseUrl 中的 Unicode 转义字符
                base_url = selected_track['baseUrl'].encode('utf-8').decode('unicode_escape')
                async with session.get(base_url) as caption_response:
                    caption_response.raise_for_status()
                    caption_content = await caption_response.text()

                # 解析字幕内容
                root = ET.fromstring(caption_content)
                transcript = []
                total_duration = 0.0

                for text in root.findall('.//text'):
                    start = float(text.attrib['start'])
                    dur = float(text.attrib['dur'])
                    content = html.unescape(text.text or "")  # 解码 HTML 实体

                    transcript.append({
                        'start': int(start),
                        'duration': int(dur),
                        'text': content
                    })

                    # 更新总时长
                    total_duration = max(total_duration, start + dur)

                return {
                    'transcript': transcript,
                    'duration': total_duration,
                }

        except Exception as e:
            logger.error(f"Error fetching captions: {e}")
            return None
    
    
    async def get_caption(self, video_id: str, default_lang: str = 'en') -> Optional[Dict[str, any]]:
        """
        异步获取并解析 YouTube 视频的字幕信息

        Args:
            video_id: YouTube 视频 ID
            language: 首选语言代码 (默认: "en")

        Returns:
            Optional[Dict[str, any]]: 
                - 包含字幕信息的字典
                - 如果视频没有字幕或出错则返回 None
        """
        try:
            url = "https://www.searchapi.io/api/v1/search"
            params = {
                "engine": "youtube_transcripts",
                "video_id": video_id,
                "lang": default_lang,
                "api_key": settings.searchio_api_key  # Add this to your settings
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("transcripts"):
                            return {
                                'transcript': data["transcripts"],
                                'duration': 0
                            }
                    return None

        except Exception as e:
            logger.error(f"Error fetching captions: {e}")
            return None

    def _format_seconds(self, seconds: float) -> str:
        """将秒数格式化为 HH:MM:SS 字符串"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = int(seconds % 60)
        return f"{hours:02}:{minutes:02}:{seconds:02}"

    async def get_video_info(self, video_id: str) -> Optional[YouTubeVideoInfo]:
        """
        使用 YouTube Data API 获取并处理视频数据

        Args:
            video_id: YouTube 视频 ID

        Returns:
            包含处理后的视频信息的 YouTubeVideoInfo 对象，如果出错则返回 None
        """
        try:
            youtube = googleapiclient.discovery.build(
                "youtube", "v3", developerKey=self.api_key
            )

            # 请求视频数据
            request = youtube.videos().list(
                part="snippet,contentDetails,statistics,player",
                id=video_id
            )
            response = request.execute()

            # 如果没有找到视频，返回 None
            if not response["items"]:
                return None

            # 提取并处理视频数据
            video_data = response["items"][0]

            youtube_info = YouTubeVideoInfo(
                title=video_data.get("snippet", {}).get("title", ""),
                channel_title=video_data.get("snippet", {}).get("channelTitle", ""),
                description=video_data.get("snippet", {}).get("description", ""),
                duration=isodate.parse_duration(
                    video_data.get("contentDetails", {}).get("duration", "PT0S")
                ).total_seconds(),
                thumbnail_url=video_data.get("snippet", {}).get("thumbnails", {}).get("high", {}).get("url", ""),
                publishedAt=video_data.get("snippet", {}).get("publishedAt", ""),
                videoEmbedUrl="https://" + video_data.get('player', {}).get('embedHtml', '').split('src="//')[1].split('"')[0] 
                    if video_data.get('player', {}).get('embedHtml') else "",
                transcript=[]
            )

            default_lang = video_data.get("snippet", {}).get('defaultLanguage', "")

            logger.info(f"start fetching captions with self make method for video {video_id}")
            captions = await self.get_caption_self_made(video_id, default_lang)

            if not captions or not captions.get('transcript'):
                logger.info(f"start fetching captions with searchapi.io for video {video_id}")
                captions = await self.get_caption(video_id, default_lang)

            if captions:
                transcript = captions.get('transcript') if captions else None

                # 对每个字幕片段的 duration 进行向下取整
                if transcript:
                    for segment in transcript:
                        segment['duration'] = int(segment['duration'])
                        segment['start'] = int(segment['start'])
                    
                    # 合并短的字幕片段
                    if len(transcript) > 1:
                        youtube_info.transcript = merge_subtitles(transcript)

                youtube_info.duration = int(captions.get('duration')) if captions else None
            else:
                logger.warning(f"No captions found for video {video_id}")

            return youtube_info

        except googleapiclient.errors.HttpError as e:
            logger.error(f"An HTTP error occurred: {e}")
            return None
        except KeyError as e:
            logger.error(f"Missing expected field in YouTube API response: {e}")
            return None 