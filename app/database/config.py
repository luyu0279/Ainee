from sqlalchemy import Column, String, Integer, Boolean, select, Text

from app.database.session import Base, get_async_session


class Config(Base):
    __tablename__ = "config"
    id = Column(Integer, primary_key=True)
    # 使用普通索引而不是外键，保持灵活性
    system_prompt = Column(Text, nullable=False)
    follow_up_question_prompt = Column(Text, nullable=False)
    show_news = Column(Boolean, default=False, nullable=False)


class ConfigRepository:
    """Repository for handling config related database operations"""

    @staticmethod
    async def get_config() -> Config:
        """Get the system prompt"""
        async with get_async_session() as session:
            result = await session.execute(select(Config))
            return result.scalars().first()


config_repository = ConfigRepository
