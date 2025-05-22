import logging

import requests
from datetime import datetime, timedelta
from typing import List


from app import settings
from app.common import Article, NewsResponse, retry_async
from app.database.refinance_news_data import article_from_newsapi_repository

logger = logging.getLogger(__name__)


class NewsAPIFetcher:
    def __init__(self, api_key, max_days=2):
        self.api_key = api_key
        self.base_url = "https://newsapi.org/v2/everything"
        self.q = "refinance OR mortgage OR financing OR refinancing OR refin"
        # "Apple OR Google OR Facebook"
        self.cache = {}
        self.max_days = max_days  # 向前查询的最大天数

    def _get_date_str(self, day_offset: int) -> str:
        # Calculate the date for T-1 (yesterday)
        return (datetime.now() - timedelta(days=day_offset)).strftime("%Y-%m-%d")

    async def fetch_news(self) -> List[Article]:
        # 只查询 T-1 的数据 (always fetch T-1 data)
        query_date = self._get_date_str(1)  # T-1

        # 检查缓存是否存在
        # if query_date in self.cache:
        #     logger.info(f"从缓存中获取 {query_date} 的数据")
        #     return self.cache[query_date]

        # 请求参数
        params = {
            "q": self.q,
            "from": query_date,
            "sortBy": "popularity",
            "apiKey": self.api_key,
            "language": "en"
        }

        logger.info(f"start fetching news for {query_date}...")

        response = requests.get(self.base_url, params=params)
        response.raise_for_status()
        data = response.json()

        # 使用 NewsResponse 解析数据
        news_response = NewsResponse(**data)
        articles = news_response.articles

        if articles:
            # Only cache articles data where content isn't "[Removed]"
            _articles = [
                article for article in articles
                if (article.content != "[Removed]" and
                    article.description not in [None, "null", "[Removed]"] and
                    article.description.strip() != "" and
                    article.url != "null" and
                    article.title != "[Removed]")
            ]

            await article_from_newsapi_repository.add_articles_bulk(_articles, fetch_from="newsapi/everything")
        else:
            logger.info(f"{query_date} 没有数据...")

        # 如果没有数据，返回空列表
        return []


news_api_fetcher = NewsAPIFetcher(settings.news_api_key)


@retry_async(Exception, tries=3, delay=10, backoff=2)
async def fetch_news_from_newsapi():
    await news_api_fetcher.fetch_news()
