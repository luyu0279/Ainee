import logging

from app.database.refinance_news_data import article_from_newsapi_repository
from app.libs.llm.news import tag_new_with_llm
from app.libs.news.mortgagenewsdaily_fetcher import fetch_news_from_mortgagenewsdaily_rss
from app.libs.news.newsapi_fetcher import fetch_news_from_newsapi

logger = logging.getLogger(__name__)


async def tag_news():
    # Get news of today and tag them
    while True:
        articles = await article_from_newsapi_repository.get_today_untagged_articles(8)
        if len(articles) == 0:  # No more articles to process
            break

        for article in articles:
            # Tag the article
            try:
                res = await tag_new_with_llm(article)
                await article_from_newsapi_repository.update_article(
                    article.id,
                    supp_processed=1,
                    supp_country=res.country,
                    supp_relevance_score=res.relevance_score,
                    supp_authority_score=res.authority_score,
                    supp_total_score=res.total_score
                )
                logger.info(f"Tagged article: {article.id}")

            except Exception as e:
                await article_from_newsapi_repository.update_article(
                    article.id,
                    supp_processed=2,
                )
                logger.error(f"Failed to tag article: {article.id}, {e}")


async def fetch_news_in_scheduler():
    try:
        await fetch_news_from_newsapi()
    except Exception as e:
        logger.error(f"Failed to fetch news from newsapi: {e}")

    try:
        await fetch_news_from_mortgagenewsdaily_rss()
    except Exception as e:
        logger.error(f"Failed to fetch news from mortgagenewsdaily: {e}")

    await tag_news()
    logger.info("News fetching task completed.")
