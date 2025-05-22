import logging
from email.utils import parsedate
import feedparser
from datetime import datetime
from app.common import Article, retry_async
from app.database.refinance_news_data import article_from_newsapi_repository

logger = logging.getLogger(__name__)


@retry_async(Exception, tries=3, delay=10, backoff=2)
async def fetch_news_from_mortgagenewsdaily_rss():
    url = "https://www.mortgagenewsdaily.com/rss/full"
    # 解析 RSS URL
    feed = feedparser.parse(url)

    # 获取 RSS 标题和描述
    logger.info(f"Feed Title: {feed.feed.title}")
    logger.info(f"Feed Description: {feed.feed.description}")

    # 获取文章列表
    articles = [
        Article(
            source={"url": entry.get("source", {}).get("url", "Unknown")},
            author=entry.get("author", "Unknown"),
            title=entry.title,
            description=entry.description,
            url=entry.link,
            urlToImage=entry.get('enclosure', {}).get('url', None),  # 默认值为 None
            # 解析 'published' 字段并将其转换为字符串格式
            publishedAt=datetime(*parsedate(entry.published)[:6]).strftime(
                "%Y-%m-%dT%H:%M:%SZ") if entry.published else None,
            content=entry.get("content", [{}])[0].get("value", "") if entry.get("content") else ""
        )
        for entry in feed.entries
    ]


    # 存入数据库
    new_articles = await article_from_newsapi_repository \
        .add_articles_bulk(articles, fetch_from="mortgagenewsdaily/rss/full")
    return new_articles
