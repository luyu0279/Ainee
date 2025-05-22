from sqlalchemy import select
from app.database.session import get_async_session
from app.database.models.annotation import Annotation
from app.database.models.annotation_relations import AnnotationRelations


class DiscussionRepository:
    async def get_discussion_for_annotation(self, annotation_id: int) -> list:
        async with get_async_session() as session:
            relations = await session.execute(
                select(AnnotationRelations).where(
                    AnnotationRelations.root_id == annotation_id
                )
            )
            relations = relations.scalars().all()

            discussions = []
            for relation in relations:
                annotation = await session.execute(
                    select(Annotation).where(Annotation.id == relation.annotation_id)
                )
                annotation = annotation.scalar()
                discussions.append(
                    {
                        "annotation": annotation,
                        "depth": relation.depth,
                        "path": relation.path,
                    }
                )

            return discussions
