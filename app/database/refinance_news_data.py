import json
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import (
    Integer,
    Column,
    Boolean,
    String,
    Text,
    Index,
    TIMESTAMP,
    func,
    Float,
    select,
    and_,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.common import Article
from app.database.session import Base, get_async_session


class RefinanceNewsData(Base):
    __tablename__ = "refinance_news_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(JSONB, nullable=True)
    author = Column(String(255), nullable=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String(2048), nullable=True)
    url_to_image = Column(String(2048), nullable=True)
    published_at = Column(TIMESTAMP, nullable=True)
    content = Column(Text, nullable=True)

    # 新增补充字段
    fetch_from = Column(String(255), nullable=True)
    supp_country = Column(String(10), nullable=True, comment="The country of the news.")
    supp_relevance_score = Column(
        Float, nullable=True, comment="The relevance score of the news."
    )
    supp_authority_score = Column(
        Float, nullable=True, comment="The authority score of the news."
    )
    supp_total_score = Column(
        Float, nullable=True, comment="The total score of the news."
    )
    supp_processed = Column(
        Integer, nullable=True, default=0
    )  # 0: 未处理, 1: 成功, 2: 失败
    deleted = Column(Boolean, nullable=True, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_articles_published_at", "published_at"),
        Index(
            "ix_articles_supp_country", "supp_country"
        ),  # 为补充字段 country 添加索引
        Index(
            "ix_articles_supp_total_score", "supp_total_score"
        ),  # 为补充字段 total_score 添加索引
        Index(
            "ix_articles_supp_processed", "supp_processed"
        ),  # 为 supp_processed 添加索引
        Index("ix_articles_deleted", "deleted"),  # 为 deleted 添加索引
    )


class ArticleFromNewsapiRepository:
    """Repository for handling Article related database operations"""

    @staticmethod
    async def get_top_articles(
        days: int = 7, limit: int = 8, country: str = "US"
    ) -> list[RefinanceNewsData]:
        """
        Get articles from the last 'days' days that are processed and not deleted, limited to a specified number.

        Args:
            days (int): Number of days to look back. Default is 3.
            limit (int): Maximum number of articles to return. Default is 8.
            country (str): Country code to filter the articles. Default is "US".

        Returns:
            List of ArticleFromNewsapi: Articles matching the criteria.
        """
        async with get_async_session() as session:
            three_days_ago = datetime.utcnow() - timedelta(days=days)
            stmt = (
                select(RefinanceNewsData)
                .where(
                    and_(
                        RefinanceNewsData.published_at >= three_days_ago,
                        RefinanceNewsData.supp_processed == 1,
                        RefinanceNewsData.supp_total_score >= 60,
                        RefinanceNewsData.deleted.is_(False),
                        RefinanceNewsData.supp_country == country,
                    )
                )
                .order_by(
                    RefinanceNewsData.published_at.desc(),  # Order by most recent first
                    RefinanceNewsData.supp_total_score.desc(),  # Order by score descending
                )
                .limit(limit)  # Limit the number of returned records
            )
            result = await session.execute(stmt)
            return result.scalars().all()

    @staticmethod
    async def add_articles_bulk(
        articles_data: list[Article], fetch_from: str
    ) -> list[RefinanceNewsData]:
        """Batch insert articles"""
        async with get_async_session() as session:
            new_articles = [
                RefinanceNewsData(
                    source=article.source.dict(),
                    author=article.author,
                    title=article.title,
                    description=article.description,
                    url=str(article.url) if article.url is not None else None,
                    url_to_image=(
                        str(article.urlToImage)
                        if article.urlToImage is not None
                        else None
                    ),
                    published_at=(
                        datetime.strptime(article.publishedAt, "%Y-%m-%dT%H:%M:%SZ")
                        if article.publishedAt
                        else None
                    ),
                    content=article.content,
                    fetch_from=fetch_from,
                )
                for article in articles_data
            ]
            session.add_all(new_articles)
            await session.commit()
            return new_articles

    @staticmethod
    async def get_today_untagged_articles(limit: int = 8) -> list[RefinanceNewsData]:
        """
        Get articles published today that have not been tagged yet.

        Args:
            limit (int): Maximum number of articles to return. Default is 8.

        Returns:
            List of RefinanceNewsData: Articles published today that are untagged.
        """
        async with get_async_session() as session:
            # Get the start of today (midnight)
            today_start = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            # Get the end of today (just before midnight of the next day)
            today_end = today_start + timedelta(days=1)

            # Query for articles published today and not tagged yet
            stmt = (
                select(RefinanceNewsData)
                .where(
                    and_(
                        RefinanceNewsData.created_at >= today_start,
                        RefinanceNewsData.created_at < today_end,
                        RefinanceNewsData.supp_processed == 0,  # Untagged articles
                        RefinanceNewsData.deleted.is_(False),
                    )
                )
                .order_by(
                    RefinanceNewsData.created_at.desc()
                )  # Sort by most recent first
                .limit(limit)  # Limit the number of returned records
            )
            result = await session.execute(stmt)
            return result.scalars().all()

    @staticmethod
    async def update_article(
        article_id: int,
        supp_processed: Boolean,
        supp_country: Optional[str] = None,
        supp_relevance_score: Optional[float] = None,
        supp_authority_score: Optional[float] = None,
        supp_total_score: Optional[float] = None,
    ) -> RefinanceNewsData:
        """Update only supp_country and supp_refinance_relevance fields of an existing article"""
        async with get_async_session() as session:
            # 查询现有文章
            result = await session.execute(
                select(RefinanceNewsData).filter_by(id=article_id)
            )
            article = result.scalars().first()

            if article is None:
                raise ValueError(f"Article with ID {article_id} not found")

            article.supp_processed = supp_processed

            # 仅更新这两个字段
            if supp_country is not None:
                article.supp_country = supp_country
            if supp_relevance_score is not None:
                article.supp_relevance_score = supp_relevance_score
            if supp_authority_score is not None:
                article.supp_authority_score = supp_authority_score
            if supp_total_score is not None:
                article.supp_total_score = supp_total_score

            await session.commit()
            return article


article_from_newsapi_repository = ArticleFromNewsapiRepository()
