from contextlib import asynccontextmanager

from pymysql import DatabaseError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app import settings

engine = create_async_engine(settings.jdbc_url)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


@asynccontextmanager
async def get_async_session() -> AsyncSession:
    """Provide a transactional scope around a series of operations"""
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except SQLAlchemyError as e:
        await session.rollback()
        raise DatabaseError(f"Database transaction error: {str(e)}") from e
    finally:
        await session.close()
