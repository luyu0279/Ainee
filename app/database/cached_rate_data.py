from typing import Optional

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Boolean, Index
from sqlalchemy.future import select
from sqlalchemy import and_
from app.database.session import Base, get_async_session


class CachedRateData(Base):
    __tablename__ = "cached_rate_data"

    id = Column(Integer, primary_key=True)
    cache_key = Column(String(255), nullable=False)
    cache_value = Column(JSONB, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_cached_rate_data_cache_key", "cache_key"),
        Index("ix_cached_rate_data_create_at", "created_at"),
        Index("ix_cached_rate_data_deleted", "deleted"),
    )


class CachedRateDataRepository:
    """Repository for handling cached rate data related database operations"""

    @staticmethod
    async def add_cached_rate_data(
        cache_key: str, cache_value: dict
    ) -> Optional[CachedRateData]:
        """Create a new cached rate data entry"""
        async with get_async_session() as session:
            # 检查是否已存在未删除的记录
            existing = await session.execute(
                select(CachedRateData).filter(
                    and_(CachedRateData.cache_key == cache_key, ~CachedRateData.deleted)
                )
            )
            if existing.scalar_one_or_none():
                return None

            new_cache_data = CachedRateData(
                cache_key=cache_key, cache_value=cache_value
            )
            session.add(new_cache_data)
            return new_cache_data

    @staticmethod
    async def get_cached_rate_data_by_key(cache_key: str) -> Optional[CachedRateData]:
        """Get cached rate data entry by cache key"""
        async with get_async_session() as session:
            result = await session.execute(
                select(CachedRateData).filter(
                    and_(CachedRateData.cache_key == cache_key, ~CachedRateData.deleted)
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def update_cached_rate_data(
        cache_key: str, **kwargs
    ) -> Optional[CachedRateData]:
        """Update cached rate data entry by cache key"""
        async with get_async_session() as session:
            result = await session.execute(
                select(CachedRateData).filter(
                    and_(CachedRateData.cache_key == cache_key, ~CachedRateData.deleted)
                )
            )
            cached_data = result.scalar_one_or_none()

            if cached_data:
                for key, value in kwargs.items():
                    if hasattr(cached_data, key) and key not in {
                        "id",
                        "cache_key",
                        "deleted",
                        "created_at",
                    }:
                        setattr(cached_data, key, value)
                return cached_data
            return None

    @staticmethod
    async def delete_cached_rate_data(cache_key: str) -> bool:
        """Soft delete cached rate data entry"""
        async with get_async_session() as session:
            result = await session.execute(
                select(CachedRateData).filter(
                    and_(CachedRateData.cache_key == cache_key, ~CachedRateData.deleted)
                )
            )
            cached_data = result.scalar_one_or_none()

            if cached_data:
                cached_data.deleted = True
                return True
            return False


cached_rate_data_repository = CachedRateDataRepository()
