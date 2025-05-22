import requests
from typing import Dict, List, Optional
import re
from html import escape
import httpx
from dateutil import parser as date_parser
from datetime import timezone
from app import settings
from app.common import retry_async

class TwitterService:
    TWITTER_URL_PATTERN = r'https?://(www\.)?(twitter|x)\.com/\w+/status/(\d+)'

    def __init__(self):
        self.api_host = "twitter-api45.p.rapidapi.com"
        self.api_key = settings.rapidapi_key  # Note: In production, this should be in environment variables
        
    @staticmethod
    def _extract_tweet_id_from_url(url: str) -> Optional[str]:
        """从 Twitter 或 X 的 URL 中提取 tweet id"""
        import re
        match = re.search(TwitterService.TWITTER_URL_PATTERN, url)
        if match:
            return match.group(3)
        return None

    def _get_tweet_id_from_url(self, url: str) -> Optional[str]:
        """Extract tweet ID from Twitter or X URL (for backward compatibility)."""
        return self._extract_tweet_id_from_url(url)

    @retry_async(Exception, tries=3, delay=1, backoff=2)
    async def fetch_thread(self, url: str) -> Dict:
        """Fetch thread data from Twitter API asynchronously."""
        tweet_id = self._get_tweet_id_from_url(url)
        if not tweet_id:
            raise ValueError("Invalid Twitter URL")

        headers = {
            "x-rapidapi-host": self.api_host,
            "x-rapidapi-key": self.api_key
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://{self.api_host}/tweet_thread.php",
                headers=headers,
                params={"id": tweet_id},
                timeout=10.0
            )
        if response.status_code != 200:
            raise Exception(f"API request failed with status {response.status_code}")
        return response.json()

    def _create_media_html(self, media: Optional[Dict]) -> str:
        """Generate HTML for media content, supporting both photo and video."""
        if not media:
            return ""
        media_html = ""
        # 处理图片
        if "photo" in media:
            for photo in media["photo"]:
                if "media_url_https" in photo:
                    media_html += f'<img src="{photo["media_url_https"]}" alt="Tweet media"><br>'
        # 处理视频
        if "video" in media:
            for video in media["video"]:
                # 选出最高码率的 mp4
                mp4_variants = [v for v in video.get("variants", []) if v.get("content_type") == "video/mp4" and "url" in v]
                if mp4_variants:
                    # 按 bitrate 降序排序，优先高码率
                    mp4_variants.sort(key=lambda v: v.get("bitrate", 0), reverse=True)
                    best_mp4 = mp4_variants[0]
                    video_url = best_mp4["url"]
                    # aspect_ratio
                    width = video.get("original_info", {}).get("width", 480)
                    height = video.get("original_info", {}).get("height", 270)
                    media_html += f'<video controls preload="metadata"  width="{width}" height="{height}"><source src="{video_url}" type="video/mp4"></video><br>'
        return media_html

    def generate_article_html(self, thread_data: Dict) -> str:
        """Generate HTML fragment from thread data (no top-level tags)."""
        if not thread_data or "author" not in thread_data:
            raise ValueError("Invalid thread data")

        main_author = thread_data["author"]["screen_name"]
        html_parts = []

        # 作者信息
        # html_parts.append(f'<img src="{thread_data["author"]["image"]}" alt="Author avatar">')
        html_parts.append(f'<strong>{escape(thread_data["author"]["name"])}</strong> ')
        html_parts.append(f'<span>@{escape(thread_data["author"]["screen_name"])}<br></span>')
        html_parts.append('<br>')

        # 主推文
        html_parts.append(f'<p>{escape(thread_data["display_text"])}</p>')
        # 主推文媒体内容收集
        thread_images = set()
        thread_videos = set()
        main_media = thread_data.get("media")
        if main_media:
            filtered_media = {}
            # 处理照片
            if "photo" in main_media:
                new_photos = []
                for photo in main_media["photo"]:
                    url = photo.get("media_url_https")
                    if url and url not in thread_images:
                        new_photos.append(photo)
                        thread_images.add(url)
                if new_photos:
                    filtered_media["photo"] = new_photos
            # 处理视频
            if "video" in main_media:
                new_videos = []
                for video in main_media["video"]:
                    variants = [v for v in video.get("variants", []) if v.get("content_type") == "video/mp4" and "url" in v]
                    if variants:
                        video_url = variants[0]["url"]
                        if video_url not in thread_videos:
                            new_videos.append(video)
                            thread_videos.add(video_url)
                if new_videos:
                    filtered_media["video"] = new_videos
            if filtered_media:
                html_parts.append(self._create_media_html(filtered_media))

        # 线程内同作者推文
        if "thread" in thread_data:
            for tweet in thread_data["thread"]:
                if tweet["author"]["screen_name"] == main_author:
                    html_parts.append('<hr>')
                    html_parts.append(f'<p>{escape(tweet["display_text"])}</p>')
                    tweet_media = tweet.get("media")
                    if tweet_media:
                        filtered_media = {}
                        # 处理照片
                        if "photo" in tweet_media:
                            new_photos = []
                            for photo in tweet_media["photo"]:
                                url = photo.get("media_url_https")
                                if url and url not in thread_images:
                                    new_photos.append(photo)
                                    thread_images.add(url)
                            if new_photos:
                                filtered_media["photo"] = new_photos
                        # 处理视频
                        if "video" in tweet_media:
                            new_videos = []
                            for video in tweet_media["video"]:
                                variants = [v for v in video.get("variants", []) if v.get("content_type") == "video/mp4" and "url" in v]
                                if variants:
                                    video_url = variants[0]["url"]
                                    if video_url not in thread_videos:
                                        new_videos.append(video)
                                        thread_videos.add(video_url)
                            if new_videos:
                                filtered_media["video"] = new_videos
                        if filtered_media:
                            html_parts.append(self._create_media_html(filtered_media))
        return '\n'.join(html_parts)

    async def process_twitter_url(self, url: str) -> dict:
        """Main method to process Twitter URL and return a dict for Content storage."""
        thread_data = await self.fetch_thread(url)
        html_content = self.generate_article_html(thread_data)
        author = thread_data["author"]["name"]
        author_screen_name = thread_data["author"]["screen_name"]
        lang = thread_data.get("lang")
        published_time_str = thread_data.get("created_at")
        published_time = None
        if published_time_str:
            try:
                dt = date_parser.parse(published_time_str)
                # 转为 UTC 并去掉 tzinfo，变成 naive
                published_time = dt.astimezone(timezone.utc).replace(tzinfo=None)
            except Exception:
                published_time = None
        source = url
        # 封面优先取主推文图片，没有则取视频封面
        cover = None
        images = []
        # 主推文图片
        if thread_data.get("media") and "photo" in thread_data["media"]:
            for photo in thread_data["media"]["photo"]:
                if "media_url_https" in photo:
                    images.append(photo["media_url_https"])
            if images:
                cover = images[0]
        # 主推文视频封面
        if not cover and thread_data.get("media") and "video" in thread_data["media"]:
            for video in thread_data["media"]["video"]:
                thumb = video.get("media_url_https")
                if thumb:
                    cover = thumb
                    break
        # thread 内图片（去重）
        main_image_set = set(images)
        if "thread" in thread_data:
            for tweet in thread_data["thread"]:
                if tweet["author"]["screen_name"] == author_screen_name:
                    if tweet.get("media") and "photo" in tweet["media"]:
                        for photo in tweet["media"]["photo"]:
                            if "media_url_https" in photo and photo["media_url_https"] not in main_image_set:
                                images.append(photo["media_url_https"])
                                main_image_set.add(photo["media_url_https"])
        # 标题：优先主推文 display_text 的前30字，否则用 Twitter thread by @xxx
        display_text = thread_data.get("display_text") or thread_data.get("text") or ""
        title = display_text.strip().replace('\n', ' ')[:30] or f"Twitter thread by @{author_screen_name}"
        # 拼接 text_content
        text_content_list = []
        if thread_data.get("display_text"):
            text_content_list.append(thread_data["display_text"].strip())
        if "thread" in thread_data:
            for tweet in thread_data["thread"]:
                if tweet["author"]["screen_name"] == author_screen_name and tweet.get("display_text"):
                    text_content_list.append(tweet["display_text"].strip())
        text_content = '\n'.join(text_content_list)
        # images 最多10张
        images = images[:10]
        # 返回 dict
        return {
            "title": title,
            "content": html_content,
            "author": author,
            "lang": lang,
            "published_time": published_time,
            "source": source,
            "cover": cover,
            "images": images if images else None,
            "media_type": "article",
            "text_content": text_content,
        }

    @staticmethod
    def is_twitter_url(url: str) -> bool:
        import re
        return re.match(TwitterService.TWITTER_URL_PATTERN, url) is not None
