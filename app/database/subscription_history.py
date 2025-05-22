import time
from typing import Optional

from sqlalchemy import (
    ForeignKey,
    Column,
    Integer,
    String,
    Text,
    Index,
    select,
    and_,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import relationship
from app.database.session import get_async_session, Base
from sqlalchemy.dialects.postgresql import JSONB


class SubscriptionHistory(Base):
    __tablename__ = "subscription_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    subscription_id = Column(String(255), nullable=False)
    event_type = Column(String(255), nullable=False)
    event_data = Column(JSONB, nullable=True)  # Optional field
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_subscription_history_user_id", "user_id"),
        Index("ix_subscription_history_subscription_id", "subscription_id"),
        Index("ix_subscription_history_event_type", "event_type"),
    )


class SubscriptionHistoryRepository:
    """Repository for handling subscription history related database operations"""

    @staticmethod
    async def add_subscription_history(
        user_id: int,
        subscription_id: str,
        event_type: str,
        event_data: Optional[dict] = None,
    ) -> SubscriptionHistory:
        """Create a new subscription history entry"""
        async with get_async_session() as session:
            new_subscription_history = SubscriptionHistory(
                user_id=user_id,
                subscription_id=subscription_id,
                event_type=event_type,
                event_data=event_data,
            )
            session.add(new_subscription_history)
            return new_subscription_history


subscription_history_repository = SubscriptionHistoryRepository
