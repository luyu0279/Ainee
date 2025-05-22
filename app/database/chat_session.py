from typing import Optional

from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Index, select, Boolean

from app.context import context_user
from app.database.session import Base, get_async_session
from app.database.utils import require_user


class ChatSession(Base):
    __tablename__ = "chat_session"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    agent_id = Column(Integer, nullable=True)
    session_id = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("ix_chat_session_user_id", "user_id"),
        Index("ix_chat_session_session_id", "session_id"),
        Index("ix_chat_session_created_at", "created_at"),
        Index("ix_chat_session_agent_id", "agent_id"),
    )


class ChatSessionRepository:
    """Repository for handling chat session related database operations"""

    @staticmethod
    @require_user(default_return=None)
    async def create_chat_session(session_id: str, agent_id: int) -> ChatSession:
        """Create a new chat session"""
        async with get_async_session() as session:
            new_chat_session = ChatSession(
                user_id=context_user.get().id, session_id=session_id, agent_id=agent_id
            )
            session.add(new_chat_session)
            return new_chat_session

    @staticmethod
    @require_user(default_return=None)
    async def get_first_chat_session_by_user() -> Optional[ChatSession]:
        """Get the first chat session for a given user, ordered by created_at and ensuring deleted is False"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ChatSession)
                .filter(
                    ChatSession.user_id == context_user.get().id,
                    ChatSession.deleted == False,  # Ensure deleted is False
                )
                .order_by(
                    ChatSession.created_at.asc()
                )  # Sort by created_at in ascending order
                .limit(1)  # Only get the first result
            )
            return (
                result.scalars().first()
            )  # Returns the first record or None if not found

    @staticmethod
    @require_user(default_return=None)
    async def get_session_by_agent_id_and_user(agent_id: int) -> Optional[ChatSession]:
        """Get a chat session by agent_id and user_id"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ChatSession).filter(
                    ChatSession.user_id == context_user.get().id,
                    ChatSession.agent_id == agent_id,
                    ChatSession.deleted == False,  # Ensure deleted is False
                )
            )
            return result.scalars().first()

    @staticmethod
    @require_user(default_return=None)
    async def get_session_by_session_id_and_user(
        session_id: str,
    ) -> Optional[ChatSession]:
        """Get a chat session by session_id and user_id"""
        async with get_async_session() as session:
            result = await session.execute(
                select(ChatSession).filter(
                    ChatSession.user_id == context_user.get().id,
                    ChatSession.session_id == session_id,
                    ChatSession.deleted == False,  # Ensure deleted is False
                )
            )
            return result.scalars().first()


chat_session_repository = ChatSessionRepository()
