from typing import Optional, List
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    Column,
    Integer,
    Float,
    Text,
    TIMESTAMP,
    Boolean,
    select,
    Index,
    String,
)
from sqlalchemy.sql import func

from app.context import context_user
from app.database.session import Base, get_async_session
from app.database.utils import require_user


class UserLocation(Base):
    __tablename__ = "user_geocode_location"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    country = Column(String(255), nullable=False)
    region = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    reversed_geocode_raw = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Declaring indexes
    __table_args__ = (
        Index("ix_user_geocode_location_user_id", "user_id"),
        Index("ix_user_geocode_location_created_at", "created_at"),
        Index("ix_user_geocode_location_updated_at", "updated_at"),
        Index(
            "ix_user_geocode_location_country", "country"
        ),  # Index for the country field
        Index(
            "ix_user_geocode_location_region", "region"
        ),  # Index for the region field
    )


class UserLocationRepository:
    """Repository for handling user location related database operations"""

    @staticmethod
    @require_user(default_return=None)
    async def get_user_location_by_id(location_id: int) -> Optional[UserLocation]:
        """Retrieve a user location by its ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserLocation).filter(
                    UserLocation.id == location_id,
                    UserLocation.user_id == context_user.get().id,
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    @require_user(default_return=None)
    async def get_locations_by_user_id(user_id: int) -> Optional[List[UserLocation]]:
        """Retrieve all locations associated with a user"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserLocation)
                .filter(UserLocation.user_id == context_user.get().id)
                .order_by(UserLocation.created_at.desc())
            )
            return result.scalars().all()

    @staticmethod
    @require_user(default_return=None)
    async def upsert_user_location(
        latitude: float,
        longitude: float,
        region: Optional[str],
        country: Optional[str],
        geocode_raw: Optional[str] = None,
    ) -> Optional[UserLocation]:
        """Create a new user location entry or update an existing one based on user_id"""
        async with get_async_session() as session:
            # Check if the user already has a location record
            result = await session.execute(
                select(UserLocation).filter(
                    UserLocation.user_id == context_user.get().id
                )
            )
            location = result.scalar_one_or_none()

            if location:
                # Update the existing location
                location.latitude = latitude
                location.longitude = longitude
                location.reversed_geocode_raw = geocode_raw
                location.region = region
                location.country = country
            else:
                # Create a new location record
                location = UserLocation(
                    user_id=context_user.get().id,
                    latitude=latitude,
                    longitude=longitude,
                    reversed_geocode_raw=geocode_raw,
                    region=region,
                    country=country,
                )
                session.add(location)

            # No need for commit() here, it's handled by get_async_session
            return location


upsert_user_location = UserLocationRepository
