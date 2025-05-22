from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy import (
    ForeignKey,
    Integer,
    String,
    Boolean,
    Text,
    Enum,
    Column,
    CheckConstraint,
    Index,
    select,
    literal_column,
    update,
    and_,
    TIMESTAMP,
    func,
)
from sqlalchemy.sql import expression
from sqlalchemy.ext.declarative import declarative_base
import enum

from sqlalchemy.orm import relationship

from app.database.session import get_async_session, Base


class SubscriptionStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"
    PENDING = "PENDING"
    IN_GRACE_PERIOD = "IN_GRACE_PERIOD"
    ON_HOLD = "ON_HOLD"
    PAUSED = "PAUSED"


class Subscriptions(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id = Column(String, nullable=False)
    purchase_token = Column(String, nullable=False, unique=True)

    # PostgreSQL ENUM type for status field
    status = Column(
        Enum(SubscriptionStatus, name="subscription_status_enum", create_type=False),
        nullable=False,
        server_default="PENDING",
    )

    # Timestamps with timezone
    expiry_time = Column(TIMESTAMP(timezone=True), nullable=True)
    start_time = Column(TIMESTAMP(timezone=True), nullable=True)

    cancel_reason = Column(Text, nullable=True)
    cancel_survey_reason = Column(Integer, nullable=True)

    # Price related fields
    price_amount_micros = Column(Integer, nullable=True)
    price_currency_code = Column(
        String(3), nullable=True
    )  # ISO 4217 currency code length is 3

    payment_state = Column(Integer, nullable=True)
    auto_renewing = Column(Boolean, nullable=True)
    acknowledged = Column(Boolean, server_default=expression.false(), nullable=False)

    # Using JSONB to store additional metadata - renamed from 'metadata' to 'subscription_metadata'
    subscription_metadata = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        # PostgreSQL partial index - only index active subscriptions
        Index(
            "ix_subscriptions_active_expiry",
            "expiry_time",
            postgresql_where=status == SubscriptionStatus.ACTIVE,
        ),
        # Composite partial index - for querying user's active subscriptions
        Index(
            "ix_subscriptions_user_active",
            "user_id",
            postgresql_where=status == SubscriptionStatus.ACTIVE,
        ),
        # B-tree index supporting sorting and range queries
        Index("ix_subscriptions_start_time", "start_time", postgresql_using="btree"),
        # Basic indexes
        Index("ix_subscriptions_subscription_id", "subscription_id"),
        Index("ix_subscriptions_status", "status"),
    )


class SubscriptionRepository:
    """Repository for handling subscription data related database operations"""

    @staticmethod
    def _process_purchase_data(purchase_data: Dict) -> Dict:
        """
        Process purchase data from Google Play Store format into database format
        """

        def milliseconds_to_datetime(millis_str: str) -> Optional[datetime]:
            if not millis_str:
                return None
            try:
                return datetime.fromtimestamp(int(millis_str) / 1000)
            except (ValueError, TypeError):
                return None

        return {
            "start_time": milliseconds_to_datetime(
                purchase_data.get("startTimeMillis")
            ),
            "expiry_time": milliseconds_to_datetime(
                purchase_data.get("expiryTimeMillis")
            ),
            "auto_renewing": purchase_data.get("autoRenewing"),
            "price_currency_code": purchase_data.get("priceCurrencyCode"),
            "price_amount_micros": (
                int(purchase_data.get("priceAmountMicros"))
                if purchase_data.get("priceAmountMicros")
                else None
            ),
            "cancel_reason": purchase_data.get("cancelReason"),
            "acknowledged": bool(purchase_data.get("acknowledgementState")),
            "payment_state": purchase_data.get("purchaseType"),
            "subscription_metadata": {
                "country_code": purchase_data.get("countryCode"),
                "developer_payload": purchase_data.get("developerPayload"),
                "order_id": purchase_data.get("orderId"),
                "kind": purchase_data.get("kind"),
                "obfuscated_external_account_id": purchase_data.get(
                    "obfuscatedExternalAccountId"
                ),
            },
        }

    @staticmethod
    async def add_subscription(
        user_id: int,
        subscription_id: str,
        purchase_token: str,
        status: SubscriptionStatus,
        purchase_data: Dict,
    ) -> Optional[Subscriptions]:
        """
        Add a new subscription entry with processed purchase data

        Args:
            user_id: The ID of the user
            subscription_id: The subscription identifier
            purchase_token: The unique purchase token
            status: The subscription status
            purchase_data: Raw purchase data from Google Play Store

        Returns:
            Optional[Subscriptions]: The created subscription or None if already exists
        """
        async with get_async_session() as session:
            # Check for existing subscription
            existing = await session.execute(
                select(Subscriptions).filter(
                    Subscriptions.purchase_token == purchase_token
                )
            )
            if existing.scalar_one_or_none():
                return None  # Already exists, return None

            # Process purchase data
            processed_data = SubscriptionRepository._process_purchase_data(
                purchase_data
            )

            # Create new subscription with all fields
            new_subscription = Subscriptions(
                user_id=user_id,
                subscription_id=subscription_id,
                purchase_token=purchase_token,
                status=status,
                **processed_data  # Unpack all processed fields
            )

            session.add(new_subscription)

            return new_subscription

    @staticmethod
    async def get_subscription_by_token(purchase_token: str) -> Optional[Subscriptions]:
        """Retrieve subscription by purchase token"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Subscriptions).filter(
                    Subscriptions.purchase_token == purchase_token
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def update_subscription_status(
        purchase_token: str,
        new_status: SubscriptionStatus,
        new_expiry_time: Optional[int] = None,
    ) -> Optional[Subscriptions]:
        """Update subscription status"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Subscriptions).filter(
                    Subscriptions.purchase_token == purchase_token
                )
            )
            subscription = result.scalar_one_or_none()
            if subscription:
                subscription.status = new_status
                if new_expiry_time:
                    subscription.expiry_time = new_expiry_time
                await session.commit()
                return subscription
            return None

    @staticmethod
    async def cancel_subscription(
        purchase_token: str,
        cancel_reason: str,
        cancel_survey_reason: Optional[int] = None,
    ) -> Optional[Subscriptions]:
        """Cancel a subscription and set the cancel reason"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Subscriptions).filter(
                    Subscriptions.purchase_token == purchase_token
                )
            )
            subscription = result.scalar_one_or_none()
            if subscription:
                subscription.status = SubscriptionStatus.CANCELED
                subscription.cancel_reason = cancel_reason
                subscription.cancel_survey_reason = cancel_survey_reason
                await session.commit()
                return subscription
            return None

    @staticmethod
    async def get_active_subscriptions_by_user(user_id: int) -> list[Subscriptions]:
        """Get all active subscriptions for a user"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Subscriptions).filter(
                    and_(
                        Subscriptions.user_id == user_id,
                        Subscriptions.status == SubscriptionStatus.ACTIVE,
                    )
                )
            )
            return result.scalars().all()

    @staticmethod
    async def delete_subscription(purchase_token: str) -> Optional[Subscriptions]:
        """Soft delete a subscription (mark as deleted)"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Subscriptions).filter(
                    Subscriptions.purchase_token == purchase_token
                )
            )
            subscription = result.scalar_one_or_none()
            if subscription:
                # Marking as deleted (soft delete approach)
                subscription.status = SubscriptionStatus.CANCELED
                await session.commit()
                return subscription
            return None


subscription_repository = SubscriptionRepository()
