from typing import Optional, List

from sqlalchemy.exc import DatabaseError

from app.database.session import Base, get_async_session
from sqlalchemy import (
    Column,
    String,
    Index,
    Integer,
    TIMESTAMP,
    func,
    Boolean,
    and_,
    Text,
)
from sqlalchemy.future import select

from app.libs.auth.auth_utils import generate_uid


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    uid = Column(String(50), nullable=False)
    name = Column(String(255), nullable=True)
    provider = Column(String(50), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)
    picture = Column(String(255), nullable=True)
    email_verified = Column(Boolean, nullable=True)
    firebase_aud = Column(String(255), nullable=True)
    self_set_country = Column(String(255), nullable=True)
    self_set_region = Column(String(255), nullable=True)
    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_chat_enabled = Column(Boolean, nullable=False, default=True)
    fcm_registration_token = Column(String(255), nullable=True, comment="FCM 注册令牌，用于推送通知")

    __table_args__ = (
        Index("ix_users_provider_user_id", "provider_user_id"),
        Index("ix_users_provider", "provider"),
        Index("ix_users_uid", "uid"),
        Index("ix_users_deleted", "deleted"),
        Index("ix_users_created_at", "created_at"),
        Index("ix_users_self_set_country", "self_set_country"),
        Index("ix_users_self_set_region", "self_set_region"),
    )


class UserRepository:
    """Repository for handling user-related database operations"""

    @staticmethod
    async def add_account(
        email: str,
        email_verified: bool,
        picture: Optional[str],
        name: Optional[str],
        provider: str,
        provider_user_id: str,
    ) -> UserModel:
        """Create a new user account"""
        async with get_async_session() as session:
            # Check if user already exists
            existing_user = await UserRepository.get_account_by_provider_user_id(
                provider_user_id, provider
            )
            if existing_user and not existing_user.deleted:
                raise DatabaseError("User already exists")

            new_account = UserModel(
                uid=generate_uid(),
                provider=provider,
                name=name,
                email=email,
                email_verified=email_verified,
                picture=picture,
                provider_user_id=provider_user_id,
            )
            session.add(new_account)
            await session.flush()
            return new_account

    @staticmethod
    async def get_account_by_provider_user_id(
        provider_user_id: str, provider: str
    ) -> Optional[UserModel]:
        """Get user account by provider user ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(
                        UserModel.provider_user_id == provider_user_id,
                        UserModel.provider == provider,
                        ~UserModel.deleted,
                    )
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def get_account_by_id(account_id: int) -> Optional[UserModel]:
        """Get user account by internal ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.id == account_id, ~UserModel.deleted)
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def get_account_by_uid(uid: str) -> Optional[UserModel]:
        """Get user account by UID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(and_(UserModel.uid == uid, ~UserModel.deleted))
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def get_account_by_email(email: str) -> Optional[UserModel]:
        """Get user account by email"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.email == email, ~UserModel.deleted)
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def update_account(user_id: int, **kwargs) -> Optional[UserModel]:
        """Update user account"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.id == user_id, ~UserModel.deleted)
                )
            )
            account = result.scalar_one_or_none()

            if account:
                # Update all fields, including those with None values
                for key, value in kwargs.items():
                    if hasattr(account, key):
                        setattr(account, key, value)
                await session.flush()  # Ensure changes are applied to the session
                return account
            return None

    @staticmethod
    async def delete_account(account_id: int) -> bool:
        """Soft delete user account"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.id == account_id, ~UserModel.deleted)
                )
            )
            account = result.scalar_one_or_none()

            if account:
                account.deleted = True
                await session.flush()
                return True
            return False

    @staticmethod
    async def restore_account(account_id: int) -> bool:
        """Restore a soft-deleted user account"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.id == account_id, ~UserModel.deleted)
                )
            )
            account = result.scalar_one_or_none()

            if account:
                account.deleted = False
                await session.flush()
                return True
            return False

    @staticmethod
    async def get_users_by_ids(user_ids: List[int]) -> List[UserModel]:
        """Get multiple users by their IDs"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserModel).filter(
                    and_(UserModel.id.in_(user_ids), ~UserModel.deleted)
                )
            )
            return result.scalars().all()


user_repository = UserRepository
