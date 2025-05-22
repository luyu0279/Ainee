from sqlalchemy import select, update, func
from app.database.session import get_async_session
from app.database.models.chat import ChatAssistant, ChatStartType, SessionRecord
from app.database.utils import require_user
from app.context import context_user
from typing import List, Optional, Tuple
from sqlalchemy.exc import SQLAlchemyError
import logging
import uuid

logger = logging.getLogger(__name__)


class ChatAssistantRepository:
    @staticmethod
    async def get_by_id(assistant_id: int) -> ChatAssistant | None:
        async with get_async_session() as session:
            result = await session.execute(
                select(ChatAssistant).where(ChatAssistant.id == assistant_id)
            )
            return result.scalar()

    @staticmethod
    async def get_by_uid(uid: str, include_deleted: bool = False) -> ChatAssistant | None:
        async with get_async_session() as session:
            query = select(ChatAssistant).where(ChatAssistant.uid == uid)
            if not include_deleted:
                query = query.where(ChatAssistant.is_deleted.is_(False))
            result = await session.execute(query)
            return result.scalar()

    @staticmethod
    @require_user(default_return=None)
    async def create(
        name: str,
        chat_start_type: ChatStartType,
        description: Optional[str] = None,
        content_id: Optional[int] = None,
        kb_id: Optional[int] = None,
    ) -> ChatAssistant | None:
        uid = str(uuid.uuid4())
        async with get_async_session() as session:
            assistant = ChatAssistant(
                name=name,
                user_id=context_user.get().id,
                chat_start_type=chat_start_type,
                description=description,
                content_id=content_id,
                kb_id=kb_id,
            )
            session.add(assistant)
            await session.commit()
            await session.refresh(assistant)
            return assistant

    @staticmethod
    async def update(assistant_id: int, **kwargs) -> ChatAssistant | None:
        """Update a chat assistant and return the updated data"""
        async with get_async_session() as session:
            result = await session.execute(
                update(ChatAssistant).where(ChatAssistant.id == assistant_id).values(**kwargs)
            )
            await session.commit()

            if result.rowcount > 0:
                updated_assistant = await session.execute(
                    select(ChatAssistant).where(ChatAssistant.id == assistant_id)
                )
                return updated_assistant.scalar()
            return None

    @staticmethod
    @require_user(default_return=([], None))
    async def get_all_by_user_id(
        cursor: Optional[str] = None, limit: int = 100, user_id: Optional[int] = None
    ) -> Tuple[List[ChatAssistant], Optional[str]]:
        """Get all chat assistants for a user"""
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            cursor_time = None
            if cursor:
                cursor_assistant = await session.execute(
                    select(ChatAssistant.created_at).where(ChatAssistant.uid == cursor)
                )
                cursor_time = cursor_assistant.scalar()

            query = (
                select(ChatAssistant)
                .where(ChatAssistant.user_id == user_id)
                .where(ChatAssistant.is_deleted.is_(False))
                .order_by(ChatAssistant.created_at.desc())
            )

            if cursor_time:
                query = query.where(ChatAssistant.created_at < cursor_time)

            result = await session.execute(query.limit(limit))
            assistants = result.scalars().all()

            next_cursor = assistants[-1].uid if assistants else None

            return assistants, next_cursor

    @staticmethod
    @require_user(default_return=None)
    async def get_by_name(name: str, user_id: Optional[int] = None) -> ChatAssistant | None:
        """Get a chat assistant by its name and user_id
        
        This is useful for finding assistants based on chat_start_type, especially
        for the one-to-one mapping requirements between chat types and assistants.
        
        Args:
            name: The name of the assistant
            user_id: User ID (defaults to current user if not provided)
            
        Returns:
            ChatAssistant if found, None otherwise
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (select(ChatAssistant)
                    .where(ChatAssistant.name == name)
                    .where(ChatAssistant.user_id == user_id)
                    .where(ChatAssistant.is_deleted.is_(False)))
            result = await session.execute(query)
            return result.scalar()

    @staticmethod
    @require_user(default_return=None)
    async def get_by_name_prefix(name_prefix: str, user_id: Optional[int] = None) -> ChatAssistant:
        """Get a chat assistant by name prefix and user_id
        
        This is useful for finding an assistant with name that starts with a specific prefix,
        especially for ARTICLE and SINGLE_KNOWLEDGE_BASE assistants.
        
        Args:
            name_prefix: The prefix of the assistant name
            user_id: User ID (defaults to current user if not provided)
            
        Returns:
            First ChatAssistant object that matches the prefix, or None if not found
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (select(ChatAssistant)
                    .where(ChatAssistant.name.like(f"{name_prefix}%"))
                    .where(ChatAssistant.user_id == user_id)
                    .where(ChatAssistant.is_deleted.is_(False)))
            result = await session.execute(query)
            return result.scalar()


class SessionRecordRepository:
    @staticmethod
    async def get_by_id(session_id: int) -> SessionRecord | None:
        """根据 ID 获取会话记录"""
        async with get_async_session() as session:
            result = await session.execute(
                select(SessionRecord).where(SessionRecord.id == session_id)
            )
            return result.scalar()
    
    @staticmethod
    async def get_by_session_id(session_id: str, include_deleted: bool = False) -> SessionRecord | None:
        """根据 session_id 获取会话记录"""
        async with get_async_session() as session:
            query = select(SessionRecord).where(SessionRecord.session_id == session_id)
            if not include_deleted:
                query = query.where(SessionRecord.is_deleted.is_(False))
            result = await session.execute(query)
            return result.scalar()
    
    @staticmethod
    @require_user(default_return=None)
    async def create(
        session_id: str,
        chat_start_type: ChatStartType,
        content_id: Optional[int] = None,
        kb_id: Optional[int] = None,
        agent_id: Optional[int] = None,
    ) -> SessionRecord | None:
        """创建新的会话记录"""
        async with get_async_session() as session:
            try:
                session_record = SessionRecord(
                    user_id=context_user.get().id,
                    chat_start_type=chat_start_type,
                    content_id=content_id,
                    kb_id=kb_id,
                    session_id=session_id,
                    agent_id=agent_id,
                )
                session.add(session_record)
                await session.commit()
                await session.refresh(session_record)
                return session_record
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Error creating session record: {e}")
                return None
    
    @staticmethod
    async def update(record_id: int, **kwargs) -> SessionRecord | None:
        """更新会话记录并返回更新后的数据"""
        async with get_async_session() as session:
            try:
                result = await session.execute(
                    update(SessionRecord).where(SessionRecord.id == record_id).values(**kwargs)
                )
                await session.commit()

                if result.rowcount > 0:
                    updated_record = await session.execute(
                        select(SessionRecord).where(SessionRecord.id == record_id)
                    )
                    return updated_record.scalar()
                return None
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Error updating session record: {e}")
                return None
    
    @staticmethod
    @require_user(default_return=None)
    async def mark_as_deleted(record_id: int) -> bool:
        """将会话记录标记为已删除"""
        async with get_async_session() as session:
            try:
                result = await session.execute(
                    update(SessionRecord)
                    .where(SessionRecord.id == record_id)
                    .values(is_deleted=True)
                )
                await session.commit()
                return result.rowcount > 0
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Error marking session record as deleted: {e}")
                return False
    
    @staticmethod
    @require_user(default_return=None)
    async def get_by_chat_start_type(
        chat_start_type: ChatStartType, user_id: Optional[int] = None
    ) -> Optional[SessionRecord]:
        """根据聊天开始类型获取会话记录
        
        对于 INBOX 和 MY_KNOWLEDGE_BASES 类型的会话，每个用户只会有一个活跃记录
        
        Args:
            chat_start_type: 聊天开始类型
            user_id: 用户 ID (如果不提供，则使用当前用户)
            
        Returns:
            对应的 SessionRecord，如果不存在则返回 None
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (select(SessionRecord)
                    .where(SessionRecord.chat_start_type == chat_start_type)
                    .where(SessionRecord.user_id == user_id)
                    .where(SessionRecord.is_deleted.is_(False)))
            result = await session.execute(query)
            return result.scalar()
    
    @staticmethod
    @require_user(default_return=[])
    async def get_by_content_id(
        content_id: int, user_id: Optional[int] = None
    ) -> List[SessionRecord]:
        """根据内容 ID 获取会话记录
        
        Args:
            content_id: 内容 ID
            user_id: 用户 ID (如果不提供，则使用当前用户)
            
        Returns:
            与指定内容关联的会话记录列表
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (select(SessionRecord)
                    .where(SessionRecord.content_id == content_id)
                    .where(SessionRecord.user_id == user_id)
                    .where(SessionRecord.is_deleted.is_(False)))
            result = await session.execute(query)
            return result.scalars().all()
    
    @staticmethod
    @require_user(default_return=[])
    async def get_by_kb_id(
        kb_id: int, user_id: Optional[int] = None
    ) -> List[SessionRecord]:
        """根据知识库 ID 获取会话记录
        
        Args:
            kb_id: 知识库 ID
            user_id: 用户 ID (如果不提供，则使用当前用户)
            
        Returns:
            与指定知识库关联的会话记录列表
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (select(SessionRecord)
                    .where(SessionRecord.kb_id == kb_id)
                    .where(SessionRecord.user_id == user_id)
                    .where(SessionRecord.is_deleted.is_(False)))
            result = await session.execute(query)
            return result.scalars().all()
    
    @staticmethod
    @require_user(default_return=([], None))
    async def get_all_by_user_id(
        cursor: Optional[int] = None, limit: int = 20, user_id: Optional[int] = None
    ) -> Tuple[List[SessionRecord], Optional[int]]:
        """获取用户的所有会话记录，按创建时间降序排序
        
        Args:
            cursor: 上一页的最后一条记录的 ID
            limit: 每页记录数量
            user_id: 用户 ID (如果不提供，则使用当前用户)
            
        Returns:
            (会话记录列表, 下一页游标)
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            query = (
                select(SessionRecord)
                .where(SessionRecord.user_id == user_id)
                .where(SessionRecord.is_deleted.is_(False))
                .order_by(SessionRecord.created_at.desc())
            )

            if cursor:
                query = query.where(SessionRecord.id < cursor)

            result = await session.execute(query.limit(limit))
            records = result.scalars().all()

            next_cursor = records[-1].id if records else None

            return records, next_cursor


chat_assistant_repository = ChatAssistantRepository()
session_record_repository = SessionRecordRepository()