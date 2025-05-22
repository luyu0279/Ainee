from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, DateTime, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from app.database.session import Base
from enum import Enum as PyEnum


class ChatStartType(str, PyEnum):
    INBOX = 'inbox'
    MY_KNOWLEDGE_BASES = 'my_knowledge_bases'
    SINGLE_KNOWLEDGE_BASE = 'single_knowledge_base'
    ARTICLE = 'article'


class ChatAssistant(Base):
    __tablename__ = "chat_assistants"

    id = Column(Integer, primary_key=True)
    kb_id = Column(Integer, nullable=True)
    content_id = Column(Integer, nullable=True)
    name = Column(String(255), unique=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    chat_start_type = Column(
        Enum(ChatStartType, name='chat_start_type'),
        nullable=False,
        default=ChatStartType.INBOX
    )
    description = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    
    # Add indexes for frequently queried fields
    __table_args__ = (
        # Index for filtering assistants by user_id
        Index('ix_chat_assistants_user_id', 'user_id'),
        # Index for filtering and sorting by created_at
        Index('ix_chat_assistants_user_id_created_at', 'user_id', 'created_at'),
        # Index for is_deleted flag which is used in most queries
        Index('ix_chat_assistants_is_deleted', 'is_deleted'),
        # Index for name field which has unique constraint
        Index('ix_chat_assistants_name', 'name'),
    )



class SessionRecord(Base):
    __tablename__ = "session_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    chat_start_type = Column(
        Enum(ChatStartType, name='chat_start_type'),
        nullable=False,
        default=ChatStartType.INBOX
    )
    content_id = Column(Integer, nullable=True)
    kb_id = Column(Integer, nullable=True)
    session_id = Column(String(100), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    agent_id = Column(String(100), nullable=True)
    use_web_search = Column(Boolean, default=False)

    
    # Add indexes for frequently queried fields
    __table_args__ = (
        # Index for filtering by user_id
        Index('ix_session_records_user_id', 'user_id'),
        # Index for filtering by chat start type
        Index('ix_session_records_chat_start_type', 'chat_start_type'),
        # Index for filtering by content_id
        Index('ix_session_records_content_id', 'content_id'),
        # Index for filtering by kb_id
        Index('ix_session_records_kb_id', 'kb_id'),
        # Index for is_deleted flag which is used in most queries
        Index('ix_session_records_is_deleted', 'is_deleted'),
        # Index for created_at for sorting
        Index('ix_session_records_created_at', 'created_at'),
        Index('ix_session_records_agent_id', 'agent_id'),
        # Unique index for INBOX type sessions per user
        Index('uq_session_records_inbox_user_id', 'user_id', 
              postgresql_where=(chat_start_type == ChatStartType.INBOX) & (is_deleted == False), 
              unique=True),
        # Unique index for MY_KNOWLEDGE_BASES type sessions per user
        Index('uq_session_records_my_kb_user_id', 'user_id', 
              postgresql_where=(chat_start_type == ChatStartType.MY_KNOWLEDGE_BASES) & (is_deleted == False), 
              unique=True),
    ) 