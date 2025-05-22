from sqlalchemy import select, and_
from app.database.session import get_async_session
from app.database.models.mention import Mention


class MentionRepository:
    async def get_active_mentions(self, user_id: int) -> list[Mention]:
        async with get_async_session() as session:
            query = select(Mention).where(
                and_(Mention.user_id == user_id, Mention.is_deleted.is_(False))
            )
            result = await session.execute(query)
            return result.scalars().all()


mention_repository = MentionRepository()
