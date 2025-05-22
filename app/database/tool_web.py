from typing import Optional, Dict

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    TIMESTAMP,
    func,
    Index,
    Text,
    select,
    and_,
)
from sqlalchemy.exc import DatabaseError

from app.context import context_user
from app.database.session import Base, AsyncSessionLocal, get_async_session
from app.database.utils import require_user


class ToolWeb(Base):
    __tablename__ = "tool_web"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    gen_code = Column(String(50), nullable=False)
    tool_name = Column(String(255), nullable=False)
    submit_data = Column(JSONB, nullable=True)  # 存储用户提交的数据，可能是空数据
    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        # 索引：组合索引 user_id 和 gen_code
        Index("ix_tool_web_gen_code", "user_id", "gen_code"),
        # 索引：deleted 字段
        Index("ix_tool_web_deleted", "deleted"),
        # 索引：created_at 字段
        Index("ix_tool_web_created_at", "created_at"),
        # 索引：tool_name 字段
        Index("ix_tool_web_tool_name", "tool_name"),
    )


class ToolWebRepository:
    """Repository for handling tool web related database operations"""

    @staticmethod
    @require_user(default_return=None)
    async def add_tool_web(
        gen_code: str, submit_data: str, tool_name: str
    ) -> Optional[ToolWeb]:
        """Create a new tool web entry"""
        async with get_async_session() as session:
            # 检查是否已存在未删除的记录
            existing = await session.execute(
                select(ToolWeb).filter(
                    and_(
                        ToolWeb.gen_code == gen_code,
                        ToolWeb.user_id == context_user.get().id,
                        ~ToolWeb.deleted,
                    )
                )
            )
            if existing.scalar_one_or_none():
                return None

            new_tool_web = ToolWeb(
                user_id=context_user.get().id,
                gen_code=gen_code,
                tool_name=tool_name,
                submit_data=submit_data,
            )
            session.add(new_tool_web)
            return new_tool_web

    @staticmethod
    @require_user(default_return=None)
    async def update_tool_web_by_gen_code(gen_code: str, **kwargs) -> Optional[ToolWeb]:
        """Update tool web entry by generation code"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ToolWeb).filter(
                    and_(
                        ToolWeb.gen_code == gen_code,
                        ToolWeb.user_id == context_user.get().id,
                        ~ToolWeb.deleted,
                    )
                )
            )
            tool_web = result.scalar_one_or_none()

            if tool_web:
                for key, value in kwargs.items():
                    if hasattr(tool_web, key) and key not in {
                        "id",
                        "user_id",
                        "gen_code",
                        "deleted",
                        "created_at",
                    }:
                        setattr(tool_web, key, value)
                return tool_web
            return None

    @staticmethod
    @require_user(default_return=False)
    async def delete_tool_web(gen_code: str) -> bool:
        """Soft delete tool web entry"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ToolWeb).filter(
                    and_(
                        ToolWeb.gen_code == gen_code,
                        ToolWeb.user_id == context_user.get().id,
                        ~ToolWeb.deleted,
                    )
                )
            )
            tool_web = result.scalar_one_or_none()

            if tool_web:
                tool_web.deleted = True
                return True
            return False

    @staticmethod
    @require_user(default_return=None)
    async def get_tool_web_by_gen_code(gen_code: str) -> Optional[ToolWeb]:
        """Get tool web entry by generation code"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ToolWeb).filter(
                    and_(
                        ToolWeb.gen_code == gen_code,
                        ToolWeb.user_id == context_user.get().id,
                        ~ToolWeb.deleted,
                    )
                )
            )
            return result.scalar_one_or_none()

    @staticmethod
    @require_user(default_return=None)
    async def get_user_last_tool_web_by_user_id() -> Optional[ToolWeb]:
        """Get tool web entry by user id, get last one ordered by create time"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ToolWeb)
                .filter(
                    and_(
                        ToolWeb.user_id == context_user.get().id,
                        ToolWeb.submit_data.isnot(None),
                        ~ToolWeb.deleted,
                    )
                )
                .order_by(ToolWeb.created_at.desc())
            )
            return result.scalars().first()


tool_web_repository = ToolWebRepository()
