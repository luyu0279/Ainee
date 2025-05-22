from enum import Enum
from operator import and_
from sqlalchemy import or_, select, update, func
from app.database.session import get_async_session
from app.database.models.content import Content, ContentMediaType, ProcessingStatus, RAGProcessingStatus
from app.database.models.annotation import Annotation
from app.database.utils import require_user
from app.context import context_user
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


class ContentRepository:
    @staticmethod
    async def get_by_id(content_id: int) -> Content | None:
        async with get_async_session() as session:
            result = await session.execute(
                select(Content).where(Content.id == content_id)
            )
            return result.scalar()

    async def get_with_annotations(self, content_id: int) -> dict:
        async with get_async_session() as session:
            content = await self.get_by_id(content_id)
            if not content:
                return None

            annotations = await session.execute(
                select(Annotation)
                .where(Annotation.target_content_id == content_id)
                .where(Annotation.is_deleted.is_(False))
            )
            annotations = annotations.scalars().all()

            return {"content": content, "annotations": annotations}

    @staticmethod
    async def get_by_uid(uid: str, include_deleted: bool = False) -> Content | None:
        async with get_async_session() as session:
            query = select(Content).where(Content.uid == uid)
            if not include_deleted:
                query = query.where(Content.is_deleted.is_(False))
            result = await session.execute(query)
            return result.scalars().first()

    @staticmethod
    @require_user(default_return=None)
    async def create(
        uid: str,
        source: str,
        processing_status: ProcessingStatus = ProcessingStatus.PENDING,
        is_deleted: bool = False,
        media_type: str = ContentMediaType.article,
        file_type: Optional[str] = None,
        file_name_in_storage: Optional[str] = None,
        batch_id: Optional[str] = None,
        title: Optional[str] = None,
        lang: Optional[str] = None,
        media_seconds_duration: Optional[int] = None,
    ) -> Content | None:
        async with get_async_session() as session:
            content = Content(
                uid=uid,
                source=source,
                user_id=context_user.get().id,
                processing_status=processing_status,
                is_deleted=is_deleted,
                media_type=media_type,
                file_type=file_type,
                file_name_in_storage=file_name_in_storage,
                batch_id=batch_id,
                title=title,
                lang=lang,
                media_seconds_duration=media_seconds_duration,
            )
            session.add(content)
            await session.commit()
            await session.refresh(content)
            return content

    async def update_processing_status(
        self, content_id: int, status: ProcessingStatus
    ) -> bool:
        """更新处理状态"""
        async with get_async_session() as session:
            result = await session.execute(
                update(Content)
                .where(Content.id == content_id)
                .values(processing_status=status)
            )
            await session.commit()
            return result.rowcount > 0

    @staticmethod
    async def update(content_id: int, **kwargs) -> Content | None:
        """更新内容记录并返回更新后的数据"""
        async with get_async_session() as session:
            # 执行更新
            result = await session.execute(
                update(Content).where(Content.id == content_id).values(**kwargs)
            )
            await session.commit()

            # 如果更新成功，查询并返回最新的数据
            if result.rowcount > 0:
                updated_content = await session.execute(
                    select(Content).where(Content.id == content_id)
                )
                return updated_content.scalar()
            return None

    @staticmethod
    @require_user(default_return=([], None))
    async def get_all_by_user_id(
        cursor: Optional[str] = None, limit: int = 100, user_id: Optional[int] = None
    ) -> Tuple[List[Content], Optional[str]]:
        """获取当前用户的所有文章（基于 UID 找到创建时间，再用创建时间排序分页）"""
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            # 如果有游标，先通过 UID 找到对应的创建时间
            cursor_time = None
            if cursor:
                cursor_content = await session.execute(
                    select(Content.created_at).where(Content.uid == cursor)
                )
                cursor_time = cursor_content.scalar()

            # 查询当前用户的所有文章，按创建时间降序排序
            query = (
                select(Content)
                .where(Content.user_id == user_id)
                .where(Content.is_deleted.is_(False))
                .order_by(Content.created_at.desc())
            )

            # 如果有游标，过滤出创建时间小于游标的文章
            if cursor_time:
                query = query.where(Content.created_at < cursor_time)

            # 执行查询并限制结果数量
            result = await session.execute(query.limit(limit))
            contents = result.scalars().all()

            # 计算下一页的游标（最后一篇文章的 UID）
            next_cursor = contents[-1].uid if contents else None

            return contents, next_cursor

    @staticmethod
    async def increment_view_count(content_id: int) -> None:
        """原子操作增加查看次数"""
        async with get_async_session() as session:
            try:
                stmt = (
                    update(Content)
                    .where(Content.id == content_id)
                    .values(view_count=Content.view_count + 1)
                    .execution_options(synchronize_session="fetch")
                )
                result = await session.execute(stmt)

                if result.rowcount == 0:
                    logger.warning(f"No content found with id {content_id}")

                await session.commit()
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Failed to increment view count: {str(e)}")
                raise
            finally:
                await session.close()

    async def increment_share_count(self, content_id: int) -> None:
        """原子操作增加分享次数"""
        async with get_async_session() as session:
            try:
                stmt = (
                    update(Content)
                    .where(Content.id == content_id)
                    .values(share_count=Content.share_count + 1)
                    .execution_options(synchronize_session="fetch")
                )
                result = await session.execute(stmt)

                if result.rowcount == 0:
                    logger.warning(f"No content found with id {content_id}")

                await session.commit()
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Failed to increment share count: {str(e)}")
                raise
            finally:
                await session.close()

    @staticmethod
    @require_user(default_return={"total_views": 0, "total_shares": 0})
    async def get_user_content_stats() -> dict:
        """获取用户内容的总统计数据（仅统计未删除内容）"""
        user_id = context_user.get().id
        async with get_async_session() as session:
            query = (
                select(
                    func.coalesce(func.sum(Content.view_count), 0).label("total_views"),
                    func.coalesce(func.sum(Content.share_count), 0).label(
                        "total_shares"
                    ),
                )
                .where(Content.user_id == user_id)
                .where(Content.is_deleted.is_(False))
            )
            result = await session.execute(query)
            return result.mappings().one()

    @staticmethod
    @require_user(default_return=None)
    async def get_by_url(url: str) -> Content | None:
        """Get content by URL for the current user"""
        user_id = context_user.get().id
        async with get_async_session() as session:
            result = await session.execute(
                select(Content)
                .where(Content.user_id == user_id)
                .where(Content.source == url)
                .where(Content.is_deleted.is_(False))
            )
            return result.scalar()

    @staticmethod
    async def get_ai_mermaid_before_today() -> List[Content]:
        """获取今天之前且 ai_mermaid 字段不为空的内容"""
        async with get_async_session() as session:
            result = await session.execute(
                select(Content)
                .where(Content.ai_mermaid.is_not(None))  # ai_mermaid 不为空
                .where(Content.ai_structure.is_(None))  # ai_structure 为空
                .order_by(Content.created_at.desc())  # 按创建时间降序排列
            )
            return result.scalars().all()

    @staticmethod
    async def get_stale_pending_contents() -> List[Content]:
        """获取 created_at 大于 10 分钟且状态为 PENDING 的内容，最多返回 500 条"""
        async with get_async_session() as session:
            ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
            result = await session.execute(
                select(Content)
                .where(Content.created_at < ten_minutes_ago)
                .where(Content.processing_status.in_([ProcessingStatus.PENDING, ProcessingStatus.WAITING_INIT]))
                .limit(500)  # 限制最多返回 500 条数据
            )
            return result.scalars().all()

    @staticmethod
    async def get_by_uids(uids: List[str]) -> List[Content]:
        """
        通过多个 UID 获取内容
        :param uids: UID 列表
        :return: 内容对象列表
        """
        if not uids:
            return []

        async with get_async_session() as session:
            query = select(Content).where(Content.uid.in_(uids))
            result = await session.execute(query)
            return result.scalars().all()

    @staticmethod
    @require_user(default_return=0)
    async def get_user_total_audio_duration() -> int:
        """
        获取用户已经上传音频的总时长（秒），仅统计 PENDING 和 SUCCESS 状态的任务
        :return: 总时长（秒）
        """
        user_id = context_user.get().id
        async with get_async_session() as session:
            query = (
                select(func.coalesce(func.sum(Content.media_seconds_duration), 0))
                .where(Content.user_id == user_id)
                .where(Content.media_type.in_([ContentMediaType.audio, ContentMediaType.audio_internal, ContentMediaType.audio_microphone]))
                .where(Content.processing_status.in_([ProcessingStatus.PENDING, ProcessingStatus.COMPLETED]))
                .where(Content.is_deleted.is_(False))
            )
            result = await session.execute(query)
            return result.scalar()

    @staticmethod
    async def is_batch_completed(batch_id: str) -> bool:
        """
        检查某个批量任务是否完成（所有任务的状态为 COMPLETED 或 FAILED）
        :param batch_id: 批量任务 ID
        :return: 如果所有任务都已完成（COMPLETED 或 FAILED），返回 True；否则返回 False
        """
        async with get_async_session() as session:
            # 查询该批次下是否存在未完成的任务
            result = await session.execute(
                select(func.count())
                .select_from(Content)
                .where(Content.batch_id == batch_id)
                .where(Content.processing_status.notin_([ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]))
            )
            incomplete_count = result.scalar()
            
            # 如果没有未完成的任务，返回 True
            return incomplete_count == 0

    @staticmethod
    async def get_by_ids(content_ids: List[int]) -> List[Content]:
        """
        通过多个 ID 获取内容列表，按创建时间倒序排序
        
        Args:
            content_ids: 内容 ID 列表
            
        Returns:
            List[Content]: 内容对象列表，按创建时间倒序排序
        """
        if not content_ids:
            return []

        async with get_async_session() as session:
            result = await session.execute(
                select(Content).where(
                    Content.id.in_(content_ids)
                ).order_by(Content.created_at.desc())
            )
            return list(result.scalars().all())
        
    @staticmethod
    async def get_by_dataset_pairs(pairs: List[Tuple[str, str]]) -> List[Content]:
        """
        通过多个 (dataset_id, dataset_doc_id) 对获取内容列表
        
        Args:
            pairs: (dataset_id, dataset_doc_id) 元组列表
            
        Returns:
            List[Content]: 内容对象列表
        """
        if not pairs:
            return []

        # 构建 OR 条件
        conditions = [
            and_(
                Content.dataset_id == dataset_id,
                Content.dataset_doc_id == dataset_doc_id
            )
            for dataset_id, dataset_doc_id in pairs
        ]

        async with get_async_session() as session:
            result = await session.execute(
                select(Content).where(
                    or_(*conditions)
                )
            )
            return list(result.scalars().all())

    @staticmethod
    async def get_all_completed_articles_without_dataset(limit: int = 2000) -> List[Content]:
        """
        获取所有处理完成但未分配数据集的文章，pdf类型排在最后
        
        Args:
            user_id: 用户ID
            limit: 限制返回数量，默认 1000
            
        Returns:
            List[Content]: 文章列表
        """
        async with get_async_session() as session:
            query = (
                select(Content)
                .where(Content.is_deleted.is_(False))
                .where(Content.processing_status == ProcessingStatus.COMPLETED)
                .where(Content.rag_status == RAGProcessingStatus.waiting_init)
                .where(Content.dataset_id.is_(None))
                .where(Content.dataset_doc_id.is_(None))
                .order_by(Content.media_type == 'pdf')  # pdf 类型排在最后
                .order_by(Content.created_at.desc())
                .limit(limit)
            )
            
            result = await session.execute(query)
            return list(result.scalars().all())

    @staticmethod
    async def update_rag_status(content_id: int, status: RAGProcessingStatus) -> bool:
        """
        更新内容的RAG处理状态
        
        Args:
            content_id: 内容ID
            status: 新的RAG处理状态
            
        Returns:
            bool: 是否成功更新
        """
        async with get_async_session() as session:
            result = await session.execute(
                update(Content)
                .where(Content.id == content_id)
                .values(rag_status=status)
            )
            await session.commit()
            return result.rowcount > 0


    @staticmethod
    async def get_by_rag_status(status: RAGProcessingStatus, limit: int = 100) -> List[Content]:
        """
        获取指定RAG处理状态的内容
        
        Args:
            status: RAG处理状态
            limit: 限制返回数量
            
        Returns:
            List[Content]: 内容列表
        """
        async with get_async_session() as session:
            query = (
                select(Content)
                .where(
                    and_(
                        Content.rag_status == status,
                        Content.is_deleted == False,
                        Content.dataset_id.is_not(None),
                        Content.dataset_doc_id.is_not(None)
                    )
                )
                .limit(limit)
            )
            
            result = await session.execute(query)
            return list(result.scalars().all())
    
    @staticmethod
    async def get_rag_contents_to_process(limit: int = 100) -> List[Content]:
        """
        获取需要进行RAG处理的内容（dataset字段不为空且RAG状态为等待初始化）
        
        Args:
            limit: 限制返回数量
            
        Returns:
            List[Content]: 内容列表
        """
        async with get_async_session() as session:
            query = (
                select(Content)
                .where(
                    and_(
                        Content.is_deleted == False,
                        Content.dataset_id.is_not(None),
                        Content.dataset_doc_id.is_not(None),
                        Content.rag_status == RAGProcessingStatus.waiting_init
                    )
                )
                .limit(limit)
            )
            
            result = await session.execute(query)
            return list(result.scalars().all())

    @staticmethod
    async def update_rag_status_by_uid(content_uid: str, status: RAGProcessingStatus) -> bool:
        """
        通过UID更新内容的RAG处理状态
        
        Args:
            content_uid: 内容UID
            status: 新的RAG处理状态
            
        Returns:
            bool: 是否成功更新
        """
        async with get_async_session() as session:
            result = await session.execute(
                update(Content)
                .where(
                    and_(
                        Content.uid == content_uid,
                        Content.is_deleted == False
                    )
                )
                .values(rag_status=status)
            )
            await session.commit()
            return result.rowcount > 0
    
    @staticmethod
    async def batch_update_rag_status(content_ids: List[int], status: RAGProcessingStatus) -> int:
        """
        批量更新内容的RAG处理状态
        
        Args:
            content_ids: 内容ID列表
            status: 新的RAG处理状态
            
        Returns:
            int: 成功更新的记录数
        """
        if not content_ids:
            return 0
            
        async with get_async_session() as session:
            result = await session.execute(
                update(Content)
                .where(
                    and_(
                        Content.id.in_(content_ids),
                        Content.is_deleted == False
                    )
                )
                .values(rag_status=status)
            )
            await session.commit()
            return result.rowcount

    @staticmethod
    @require_user(default_return=[])
    async def get_all_rag_read_or_processing_content_without_pagination(user_id: Optional[int] = None) -> List[Content]:
        """
        获取当前用户的所有已处理完成的文章，不分页直接返回全部数据
        条件：processing_status为COMPLETED且rag_status为completed或processing
        
        Args:
            user_id: 用户ID，如果为None则使用当前用户
            
        Returns:
            List[Content]: 内容列表
        """
        user_id = user_id if user_id is not None else context_user.get().id
        async with get_async_session() as session:
            # 查询当前用户的所有已处理完成的文章，按创建时间降序排序
            query = (
                select(Content)
                .where(Content.user_id == user_id)
                .where(Content.is_deleted.is_(False))
                .where(Content.processing_status == ProcessingStatus.COMPLETED)
                .where(Content.rag_status.in_([RAGProcessingStatus.completed, RAGProcessingStatus.processing]))
                .order_by(Content.created_at.desc())
                .limit(10000)
            )

            # 执行查询
            result = await session.execute(query)
            contents = result.scalars().all()

            return contents



content_repository = ContentRepository()
