from sqlalchemy import select, and_, func
from app.database.session import get_async_session
from app.database.models.annotation import Annotation
from app.database.utils import require_user
from app.context import context_user
from app.database.models.annotation_relation import (
    AnnotationRelations,
)
from app.database.repositories.content_repository import ContentRepository


class AnnotationRepository:
    async def get_by_content(
        self, content_id: int, include_deleted: bool = False
    ) -> list[Annotation]:
        async with get_async_session() as session:
            query = select(Annotation).where(Annotation.target_content_id == content_id)
            if not include_deleted:
                query = query.where(Annotation.is_deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().all()

    async def get_replies(
        self, annotation_id: int, include_deleted: bool = False
    ) -> list[Annotation]:
        async with get_async_session() as session:
            query = select(Annotation).where(
                Annotation.target_annotation_id == annotation_id
            )
            if not include_deleted:
                query = query.where(Annotation.is_deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().all()

    @staticmethod
    @require_user(default_return=None)
    async def create(
        uid: str,
        target_content_id: int,
        related_annotation_ids: list[int] | None,
        annotation_content: dict,
        is_deleted: bool = False,
    ) -> Annotation | None:
        async with get_async_session() as session:
            annotation = Annotation(
                target_content_id=target_content_id,
                content=annotation_content,
                user_id=context_user.get().id,
                is_deleted=is_deleted,
                uid=uid,
            )
            session.add(annotation)
            await session.flush()

            if related_annotation_ids:
                relations = [
                    AnnotationRelations(
                        source_annotation_id=annotation.id,
                        target_annotation_id=rel_id,
                        relation_type="reference",
                    )
                    for rel_id in related_annotation_ids
                ]
                session.add_all(relations)

            await session.commit()
            await session.refresh(annotation)
            return annotation

    async def get_by_id(self, annotation_id: int) -> Annotation | None:
        async with get_async_session() as session:
            result = await session.execute(
                select(Annotation).where(Annotation.id == annotation_id)
            )
            return result.scalar()

    async def get_with_replies(self, annotation_id: int) -> dict:
        async with get_async_session() as session:
            annotation = await self.get_by_id(annotation_id)
            if not annotation:
                return None

            relations = await session.execute(
                select(AnnotationRelations).where(
                    AnnotationRelations.root_id == annotation_id
                )
            )
            relations = relations.scalars().all()

            tree = self._build_annotation_tree(relations)
            return {"annotation": annotation, "replies": tree}

    def _build_annotation_tree(self, relations: list[AnnotationRelations]) -> dict:
        tree = {}
        for relation in relations:
            if relation.parent_id is None:
                tree[relation.annotation_id] = {"replies": []}
            else:
                # 递归添加到父节点的 replies 中
                pass
        return tree

    async def delete_by_uid(self, content_uid: str, annotation_uid: str) -> bool:
        """根据 content.uid 和 annotation.uid 删除 annotation"""
        async with get_async_session() as session:
            # 通过 content.uid 找到 content.id
            content = await ContentRepository().get_by_uid(content_uid)
            if not content:
                return False

            # 通过 annotation.uid 找到 annotation.id
            result = await session.execute(
                select(Annotation).where(Annotation.uid == annotation_uid)
            )
            annotation = result.scalar()
            if not annotation:
                return False

            # 确保 annotation 的 target_content_id 与 content.id 匹配
            if annotation.target_content_id != content.id:
                return False

            # 删除 annotation
            await session.delete(annotation)
            await session.commit()
            return True

    async def update_by_uid(
        self, content_uid: str, annotation_uid: str, annotation_content: dict
    ) -> Annotation | None:
        """根据 content.uid 和 annotation.uid 更新 annotation"""
        async with get_async_session() as session:
            # 通过 content.uid 找到 content.id
            content = await ContentRepository().get_by_uid(content_uid)
            if not content:
                return None

            # 通过 annotation.uid 找到 annotation.id
            result = await session.execute(
                select(Annotation).where(Annotation.uid == annotation_uid)
            )
            annotation = result.scalar()
            if not annotation:
                return None

            # 确保 annotation 的 target_content_id 与 content.id 匹配
            if annotation.target_content_id != content.id:
                return None

            # 更新 annotation 的 content 字段
            annotation.content = annotation_content
            annotation.updated_at = func.now()  # 更新 updated_at 时间戳

            session.add(annotation)
            await session.commit()
            await session.refresh(annotation)
            return annotation

    async def get_by_uid(self, annotation_uid: str) -> Annotation | None:
        """根据 annotation.uid 获取 annotation"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Annotation).where(Annotation.uid == annotation_uid)
            )
            return result.scalar()

    @staticmethod
    @require_user(default_return=0)
    async def count_user_annotations() -> int:
        """统计当前用户的注释数量（排除已删除）"""
        user_id = context_user.get().id
        async with get_async_session() as session:
            result = await session.execute(
                select(func.count(Annotation.id))
                .where(Annotation.user_id == user_id)
                .where(Annotation.is_deleted.is_(False))
            )
            return result.scalar() or 0


annotation_repository = AnnotationRepository()
