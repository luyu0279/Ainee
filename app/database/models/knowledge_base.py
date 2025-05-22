from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, DateTime, Enum, UniqueConstraint
from sqlalchemy.sql import func
from app.database.session import Base
from enum import Enum as PyEnum


class KnowledgeBaseVisibility(str, PyEnum):
    public = "public"        # 公开可见，可在 Explore 页面检索
    private = "private"      # 仅创建者可见
    restricted = "restricted"  # 部分可见
    default = "default"      # 默认可见性：可以分享但不在 Explore 页面显示


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True)
    uid = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    user_id = Column(Integer, nullable=False)
    visibility = Column(
        Enum(KnowledgeBaseVisibility,  name='knowledge_base_visibility'),
        nullable=False,
        default=KnowledgeBaseVisibility.private
    )
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)


class KnowledgeBaseAccess(Base):
    """知识库访问权限表，仅用于 RESTRICTED 可见性"""
    __tablename__ = "knowledge_base_access"

    id = Column(Integer, primary_key=True)
    knowledge_base_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)
    revoked_at = Column(TIMESTAMP, nullable=True)
    revoked_by = Column(Integer, nullable=True)


class ContentKnowledgeBaseMapping(Base):
    """内容与知识库的关联表"""
    __tablename__ = "content_knowledge_base_mappings"

    id = Column(Integer, primary_key=True)
    content_id = Column(Integer, nullable=False)
    knowledge_base_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by = Column(Integer, nullable=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(TIMESTAMP, nullable=True)
    deleted_by = Column(Integer, nullable=True)


class KnowledgeBaseSubscription(Base):
    """知识库订阅表，用于记录用户订阅的知识库"""
    __tablename__ = "knowledge_base_subscriptions"

    id = Column(Integer, primary_key=True)
    knowledge_base_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(TIMESTAMP, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    # 添加唯一约束，确保一个用户只能订阅同一个知识库一次
    __table_args__ = (
        UniqueConstraint('knowledge_base_id', 'user_id', name='uix_kb_subscription'),
    ) 