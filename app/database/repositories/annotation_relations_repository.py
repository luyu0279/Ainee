from typing import List, Optional
from sqlalchemy import select
from app.database.session import get_async_session
from app.database.models.annotation_relation import AnnotationRelations
from app.database.models.annotation import Annotation


class AnnotationRelationsRepository:
    async def get_tree_path(self, annotation_id: int) -> Optional[List[int]]:
        """
        获取从根节点到当前节点的完整路径。
        返回一个注释ID列表，按从根到当前节点的顺序排列。
        """
        async with get_async_session() as session:
            result = await session.execute(
                select(AnnotationRelations.path).where(
                    AnnotationRelations.annotation_id == annotation_id
                )
            )
            relation = result.scalars().first()
            return list(relation) if relation else None

    async def is_root(self, annotation_id: int) -> bool:
        """
        判断当前注释是否为根节点。
        根节点的parent_id为NULL。
        """
        async with get_async_session() as session:
            result = await session.execute(
                select(AnnotationRelations.parent_id).where(
                    AnnotationRelations.annotation_id == annotation_id
                )
            )
            parent_id = result.scalars().first()
            return parent_id is None

    async def get_children(self, annotation_id: int) -> List[Annotation]:
        """
        获取当前注释的所有子注释。
        返回包含完整注释对象的列表。
        """
        async with get_async_session() as session:
            result = await session.execute(
                select(Annotation)
                .join(
                    AnnotationRelations,
                    Annotation.id == AnnotationRelations.annotation_id,
                )
                .where(AnnotationRelations.parent_id == annotation_id)
            )
            return result.scalars().all()

    async def get_relations_by_root(self, root_id: int) -> List[AnnotationRelations]:
        """
        获取指定根节点的所有关系记录。
        用于构建完整的注释树。
        """
        async with get_async_session() as session:
            result = await session.execute(
                select(AnnotationRelations)
                .where(AnnotationRelations.root_id == root_id)
                .order_by(AnnotationRelations.depth)
            )
            return result.scalars().all()


annotation_relations_repository = AnnotationRelationsRepository()
