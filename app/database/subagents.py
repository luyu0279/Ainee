import enum
from typing import Optional

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum,
    UniqueConstraint,
    Boolean,
    TIMESTAMP,
    func,
    select,
    Text,
)

from app.database.session import Base, get_async_session


# 定义枚举类型
class DialogTypeEnum(enum.Enum):
    web_url = "web_url"
    other = "other"


class SubAgents(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True)
    uid = Column(String(10), nullable=True, unique=True)
    icon = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False, unique=True)  # 添加唯一约束
    preset_questions = Column(JSONB, nullable=True)
    brief = Column(Text, nullable=True)
    welcome_message = Column(Text, nullable=True)
    welcome_buttons = Column(JSONB, nullable=False, default=[])
    weight = Column(Integer, nullable=False, default=0)
    deleted = Column(Boolean, default=False, nullable=False)
    alias = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", name="uq_agents_name"),  # 明确定义唯一约束
        UniqueConstraint("uid", name="uq_uid"),  # 明确定义唯一约束
    )


class SubAgentsRepository:
    @staticmethod
    async def get_agent_by_uid(
        agent_uid: str, include_deleted: bool = False
    ) -> Optional[SubAgents]:
        """Fetch an agent by its ID, with optional inclusion of deleted agents"""
        async with get_async_session() as session:
            query = select(SubAgents).where(SubAgents.uid == agent_uid)
            if not include_deleted:
                query = query.where(SubAgents.deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().first()

    @staticmethod
    async def get_agent_by_id(
        agent_id: int, include_deleted: bool = False
    ) -> Optional[SubAgents]:
        """Fetch an agent by its ID, with optional inclusion of deleted agents"""
        async with get_async_session() as session:
            query = select(SubAgents).where(SubAgents.id == agent_id)
            if not include_deleted:
                query = query.where(SubAgents.deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().first()

    @staticmethod
    async def get_all_agents(include_deleted: bool = False) -> list[SubAgents]:
        """Fetch all agents, sorted by weight in descending order, with optional inclusion of deleted agents."""
        async with get_async_session() as session:
            query = select(SubAgents).order_by(
                SubAgents.weight.desc()
            )  # 按 weight 倒序排序
            if not include_deleted:
                query = query.where(SubAgents.deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().all()

    @staticmethod
    async def get_agent_by_name(
        name: str, include_deleted: bool = False
    ) -> Optional[SubAgents]:
        """Fetch an agent by its name, with optional inclusion of deleted agents"""
        async with get_async_session() as session:
            query = select(SubAgents).where(SubAgents.name == name)
            if not include_deleted:
                query = query.where(SubAgents.deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().first()


sub_agents_repository = SubAgentsRepository()
