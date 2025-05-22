from typing import Optional

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    Column,
    Integer,
    Text,
    String,
    TIMESTAMP,
    func,
    Index,
    Boolean,
    select,
    and_,
)

from app.context import context_user
from app.database.session import Base, get_async_session
from app.database.utils import require_user


class UserArchive(Base):
    __tablename__ = "user_archive"

    id = Column(Integer, primary_key=True, autoincrement=True)
    upload_id = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String(255), nullable=False)
    file_name = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    mimetype = Column(String(255), nullable=False)
    label = Column(String(255), nullable=True)
    is_visible = Column(Boolean, default=False, nullable=False)
    user_id = Column(Integer, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    raw_data = Column(Text, nullable=True)
    further_info = Column(JSONB, nullable=True)  # 使用 JSONB 类型以提高性能
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_agent_upload_data_upload_id", "upload_id"),
        Index("ix_agent_upload_data_user_id", "user_id"),
        Index("ix_agent_upload_data_file_name_file_size", "file_name", "file_size"),
    )


class UserArchiveRepository:
    """Repository for handling agent upload data related database operations"""

    @staticmethod
    @require_user(default_return=None)
    async def get_agent_upload_data_by_file_name_and_size(
        file_name: str, file_size: int
    ) -> Optional[UserArchive]:
        """Retrieve an agent upload data entry by file name and file size"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserArchive).filter(
                    and_(
                        UserArchive.file_name == file_name,
                        UserArchive.file_size == file_size,
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                    )
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    @require_user(default_return=None)
    async def add_agent_upload_data(
        upload_id: str,
        url: str,
        mimetype: str,
        file_name: str,
        file_size: int,
        raw_data: Optional[str] = None,
    ) -> Optional[UserArchive]:
        """Create a new agent upload data entry"""
        async with get_async_session() as session:
            # 检查是否已存在相同 upload_id 且未被删除的记录
            existing = await session.execute(
                select(UserArchive).filter(
                    and_(
                        UserArchive.upload_id == upload_id,
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                    )
                )
            )
            if existing.scalar_one_or_none():
                return None

            new_agent_upload_data = UserArchive(
                user_id=context_user.get().id,
                upload_id=upload_id,
                url=url,
                mimetype=mimetype,
                file_name=file_name,
                file_size=file_size,
                raw_data=raw_data,
            )
            session.add(new_agent_upload_data)
            return new_agent_upload_data

    @staticmethod
    @require_user(default_return=None)
    async def get_agent_upload_data_by_id(data_id: int) -> Optional[UserArchive]:
        """Retrieve an agent upload data entry by its ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserArchive).filter(
                    and_(
                        UserArchive.id == data_id,
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                    )
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def get_agent_upload_data_by_id_without_user(
        data_id: int,
    ) -> Optional[UserArchive]:
        """Retrieve an agent upload data entry by its ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserArchive).filter(
                    and_(UserArchive.id == data_id, ~UserArchive.deleted)
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    @require_user(default_return=None)
    async def get_agent_upload_data_by_upload_id(
        upload_id: str,
    ) -> Optional[UserArchive]:
        """Retrieve an agent upload data entry by its ID"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserArchive).filter(
                    and_(
                        UserArchive.upload_id == upload_id,
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                    )
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    @require_user(default_return=False)
    async def mark_as_deleted(data_id: int) -> bool:
        """Mark an agent upload data entry as deleted"""
        async with get_async_session() as session:
            result = await session.execute(
                select(UserArchive).filter(
                    and_(
                        UserArchive.id == data_id,
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                    )
                )
            )
            agent_upload_data = result.scalar_one_or_none()
            if not agent_upload_data:
                return False

            agent_upload_data.deleted = True
            return True

    @staticmethod
    @require_user(default_return=0)
    async def count_agent_upload_data() -> int:
        """Count the number of agent upload data entries for the current user"""
        async with get_async_session() as session:
            result = await session.execute(
                select(func.count(UserArchive.id)).filter(
                    and_(
                        UserArchive.user_id == context_user.get().id,
                        ~UserArchive.deleted,
                        UserArchive.is_visible,
                    )
                )
            )
            # Return the count as a single integer
            return result.scalar()

    @staticmethod
    async def update_agent_upload_data_by_id(
        row_id: int, update_fields: dict
    ) -> Optional[UserArchive]:
        """Update the agent upload data by id with the given fields"""
        async with get_async_session() as session:
            # 查找指定的记录
            agent_upload_data = await session.execute(
                select(UserArchive).filter(UserArchive.id == row_id)
            )
            agent_upload_data = agent_upload_data.scalar_one_or_none()

            if agent_upload_data is None:
                return None  # 没有找到对应记录

            # 动态更新字段
            for field, value in update_fields.items():
                if hasattr(agent_upload_data, field):
                    setattr(agent_upload_data, field, value)

            # 提交更新
            session.add(agent_upload_data)

            return agent_upload_data

    @staticmethod
    @require_user(default_return=None)
    async def get_paginated_uploads(
        last_id: Optional[str], limit: int
    ) -> list[UserArchive]:
        """
        Retrieve paginated agent upload data entries using upload_id and limit.
        """
        async with get_async_session() as session:
            query = select(UserArchive).filter(
                and_(
                    UserArchive.user_id == context_user.get().id,
                    ~UserArchive.deleted,
                    UserArchive.is_visible,
                )
            )

            # If last_id is provided, add the upload_id condition
            if last_id is not None and last_id != "":
                last_item = (
                    await UserArchiveRepository.get_agent_upload_data_by_upload_id(
                        last_id
                    )
                )
                if not last_item:
                    return []
                query = query.filter(UserArchive.created_at < last_item.created_at)

            query = query.order_by(UserArchive.created_at.desc()).limit(limit)

            result = await session.execute(query)
            return result.scalars().all()


user_archive_repository = UserArchiveRepository()
