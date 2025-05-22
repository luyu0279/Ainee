from typing import List, Optional, Tuple
import nanoid
from sqlalchemy import select, and_, or_, func, distinct, text, literal
from sqlalchemy.sql import text
from app.database.session import get_async_session
from app.database.models.knowledge_base import (
    KnowledgeBase,
    KnowledgeBaseAccess,
    ContentKnowledgeBaseMapping,
    KnowledgeBaseSubscription,
    KnowledgeBaseVisibility
)
from app.context import context_user
from app.database.utils import require_user
from app.database.models.content import Content, ProcessingStatus
from app.database.users_dao import UserModel as User
import logging
import os
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class KnowledgeBaseRepository:
    @staticmethod
    async def get_basic_with_check_access(kb_uid: str, user_id: Optional[int] = None) -> Optional[KnowledgeBase]:
        """
        检查用户是否有权限访问知识库，并返回知识库信息
        
        Args:
            kb_uid: 知识库的 UID
            user_id: 用户 ID，如果不提供则只能访问公开的知识库
            
        Returns:
            Optional[KnowledgeBase]: 如果有权限访问则返回知识库对象，否则返回 None
        """
        async with get_async_session() as session:
            # 基础条件：知识库存在且未删除
            conditions = [
                KnowledgeBase.uid == kb_uid,
                KnowledgeBase.is_deleted == False
            ]
            
            if user_id:
                # 权限验证条件：
                # 1. 知识库是公开的，或
                # 2. 用户是知识库的创建者，或
                # 3. 知识库是受限的且用户有访问权限
                access_conditions = or_(
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.public,
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.default,
                    KnowledgeBase.user_id == user_id,
                    and_(
                        KnowledgeBase.visibility == KnowledgeBaseVisibility.restricted,
                        KnowledgeBase.id.in_(
                            select(KnowledgeBaseAccess.knowledge_base_id).where(
                                and_(
                                    KnowledgeBaseAccess.user_id == user_id,
                                    KnowledgeBaseAccess.is_active == True
                                )
                            )
                        )
                    )
                )
                conditions.append(access_conditions)
            else:
                # 未提供用户ID时，只能访问公开知识库
                conditions.append(or_(
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.public,
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.default,
                ))

            # 执行查询，返回完整的知识库对象
            query = select(KnowledgeBase).where(and_(*conditions))
            result = await session.execute(query)
            return result.scalar_one_or_none()

    @staticmethod
    async def get_kb_detail_with_access_check(kb_uid: str, user_id: Optional[int] = None) -> Optional[dict]:
        """
        获取知识库详情，并验证访问权限
        
        Args:
            kb_id: 知识库ID
            user_id: 当前用户ID，如果不提供则只能获取公开的知识库
            
        Returns:
            dict or None: 如果用户有权限访问则返回知识库信息，否则返回 None
        """
        async with get_async_session() as session:
            # 基础条件：知识库存在且未删除
            conditions = [
                KnowledgeBase.uid == kb_uid,
                KnowledgeBase.is_deleted == False
            ]
            
            if user_id:
                # 权限验证条件：
                # 1. 知识库是公开的，或 default
                # 2. 用户是知识库的创建者，或
                # 3. 知识库是受限的且用户有访问权限
                access_conditions = or_(
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.public,
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.default,
                    KnowledgeBase.user_id == user_id,
                    and_(
                        KnowledgeBase.visibility == KnowledgeBaseVisibility.restricted,
                        KnowledgeBase.id.in_(
                            select(KnowledgeBaseAccess.knowledge_base_id).where(
                                and_(
                                    KnowledgeBaseAccess.user_id == user_id,
                                    KnowledgeBaseAccess.is_active == True
                                )
                            )
                        )
                    )
                )
                conditions.append(access_conditions)
            else:
                # 未提供用户ID时，只能访问公开知识库
                conditions.append(
                    or_(
                        KnowledgeBase.visibility == KnowledgeBaseVisibility.default,
                        KnowledgeBase.visibility == KnowledgeBaseVisibility.public,
                    )
                )

            # 创建订阅状态子查询
            subscription_exists = (
                select(1)
                .where(
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.user_id == user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .correlate(KnowledgeBase)
                .exists()
                .label('is_subscribed')
            ) if user_id else literal(False).label('is_subscribed')

            # 新增：内容未被删除
            content_not_deleted = Content.is_deleted == False

            # 获取知识库详情，包括用户信息和统计数据
            query = (
                select(
                    KnowledgeBase,
                    User.uid.label('user_uid'),
                    User.name.label('user_name'),
                    User.picture.label('user_picture'),
                    func.count(distinct(KnowledgeBaseSubscription.id)).filter(
                        KnowledgeBaseSubscription.is_deleted == False
                    ).label('subscriber_count'),
                    func.count(distinct(ContentKnowledgeBaseMapping.id)).filter(
                        ContentKnowledgeBaseMapping.is_deleted == False,
                        content_not_deleted
                    ).label('content_count'),
                    subscription_exists
                )
                .join(User, KnowledgeBase.user_id == User.id)
                .outerjoin(
                    KnowledgeBaseSubscription,
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .outerjoin(
                    ContentKnowledgeBaseMapping,
                    and_(
                        ContentKnowledgeBaseMapping.knowledge_base_id == KnowledgeBase.id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
                .outerjoin(
                    Content,
                    ContentKnowledgeBaseMapping.content_id == Content.id
                )
                .where(and_(*conditions))
                .group_by(KnowledgeBase.id, User.id)
            )
            result = await session.execute(query)
            kb = result.first()
            
            if not kb:
                return None
                
            return {
                'uid': kb[0].uid,
                'name': kb[0].name,
                'description': kb[0].description,
                'visibility': kb[0].visibility,
                'created_at': kb[0].created_at,
                'updated_at': kb[0].updated_at,
                'user_uid': kb[1],
                'user_name': kb[2],
                'user_picture': kb[3],
                'subscriber_count': kb[4],
                'content_count': kb[5],
                'owned': kb[0].user_id == user_id if user_id else False,
                'subscribed': kb[6]
            }

    @staticmethod
    @require_user(default_return=None)
    async def create(
        name: str,
        description: str = None,
        user_id: int = None,
        visibility: KnowledgeBaseVisibility = KnowledgeBaseVisibility.private,
    ) -> KnowledgeBase:
        async with get_async_session() as session:
            kb = KnowledgeBase(
                uid=nanoid.generate().lower(),  # 你可能需要一个更好的 uid 生成策略
                name=name,
                description=description,
                user_id=user_id,
                visibility=visibility
            )
            session.add(kb)
            await session.commit()
            await session.refresh(kb)
            return kb
        
        
    @staticmethod
    # 添加一个工具函数来处理limit参数
    def _apply_limit_if_needed(query, limit: int):
        """
        如果limit大于0，则应用限制；如果limit为-1，返回所有记录。
        
        Args:
            query: SQLAlchemy query对象
            limit: 限制数量，-1表示不限制
            
        Returns:
            应用了限制条件的查询对象
        """
        if limit != -1:
            return query.limit(limit)
        return query
    
    @staticmethod
    @require_user(default_return=([], 0))
    async def get_own_knowledge_bases(
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[KnowledgeBase], int]:
        user_id = context_user.get().id
        async with get_async_session() as session:
            # 只查询用户自己创建的知识库
            conditions = and_(
                KnowledgeBase.user_id == user_id,
                KnowledgeBase.is_deleted == False
            )

            # 计算总数
            count_query = select(func.count()).select_from(KnowledgeBase).where(conditions)
            total = await session.execute(count_query)
            total = total.scalar()

            # 获取知识库列表，包括用户信息和统计数据
            subscription_exists = (
                select(1)
                .where(
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.user_id == user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .correlate(KnowledgeBase)
                .exists()
            )

            # 新增：内容未被删除
            content_not_deleted = Content.is_deleted == False

            query = (
                select(
                    KnowledgeBase,
                    User.uid.label('user_uid'),
                    User.name.label('user_name'),
                    User.picture.label('user_picture'),
                    func.count(distinct(KnowledgeBaseSubscription.id)).filter(
                        KnowledgeBaseSubscription.is_deleted == False
                    ).label('subscriber_count'),
                    func.count(distinct(ContentKnowledgeBaseMapping.id)).filter(
                        ContentKnowledgeBaseMapping.is_deleted == False,
                        content_not_deleted
                    ).label('content_count'),
                    subscription_exists.label('is_subscribed')
                )
                .join(User, KnowledgeBase.user_id == User.id)
                .outerjoin(
                    KnowledgeBaseSubscription,
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .outerjoin(
                    ContentKnowledgeBaseMapping,
                    and_(
                        ContentKnowledgeBaseMapping.knowledge_base_id == KnowledgeBase.id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
                .outerjoin(
                    Content,
                    ContentKnowledgeBaseMapping.content_id == Content.id
                )
                .where(conditions)
                .group_by(KnowledgeBase.id, User.id)
                .offset(offset)
                .order_by(KnowledgeBase.created_at.desc())
            )
            
            # 应用限制（如果limit不是-1）
            query = KnowledgeBaseRepository._apply_limit_if_needed(query, limit)
            
            result = await session.execute(query)
            knowledge_bases = result.all()

            datas = [
                {
                    'uid': kb[0].uid,
                    'name': kb[0].name,
                    'description': kb[0].description,
                    'visibility': kb[0].visibility,
                    'created_at': kb[0].created_at,
                    'updated_at': kb[0].updated_at,
                    'user_uid': kb[1],
                    'user_name': kb[2],
                    'user_picture': kb[3],
                    'subscriber_count': kb[4],
                    'content_count': kb[5],
                    'owned': True,  # 这是自己的知识库列表，所以都是自己拥有的
                    'subscribed': kb[6]  # 从查询结果中获取订阅状态
                }
                for kb in knowledge_bases
            ]

            return datas, total

    @staticmethod
    async def get_others_knowledge_bases(
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[KnowledgeBase], int]:
        # 从 context_user 获取当前用户ID
        current_user = context_user.get()
        current_user_id = current_user.id if current_user else None

        async with get_async_session() as session:
            # 基础条件：目标用户创建的知识库
            conditions = [
                KnowledgeBase.is_deleted == False
            ]
            
            if current_user_id is not None:
                # 权限条件：公开的或受限的（如果当前用户有访问权限）
                access_conditions = or_(
                    KnowledgeBase.visibility == KnowledgeBaseVisibility.public,
                    and_(
                        KnowledgeBase.visibility == KnowledgeBaseVisibility.restricted,
                        KnowledgeBase.id.in_(
                            select(KnowledgeBaseAccess.knowledge_base_id).where(
                                and_(
                                    KnowledgeBaseAccess.user_id == current_user_id,
                                    KnowledgeBaseAccess.is_active == True
                                )
                            )
                        )
                    )
                )
                conditions.append(access_conditions)
            else:
                # 未提供当前用户ID时，只能访问公开知识库
                conditions.append(KnowledgeBase.visibility == KnowledgeBaseVisibility.public)

            # 计算总数
            count_query = select(func.count()).select_from(KnowledgeBase).where(and_(*conditions))
            total = await session.execute(count_query)
            total = total.scalar()

            # 创建订阅状态子查询
            subscription_exists = (
                select(1)
                .where(
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.user_id == current_user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .correlate(KnowledgeBase)
                .exists()
                .label('is_subscribed')
            ) if current_user_id else literal(False).label('is_subscribed')

            # 新增：内容未被删除
            content_not_deleted = Content.is_deleted == False

            # 获取知识库列表，包括用户信息和统计数据
            query = (
                select(
                    KnowledgeBase,
                    User.uid.label('user_uid'),
                    User.name.label('user_name'),
                    User.picture.label('user_picture'),
                    func.count(distinct(KnowledgeBaseSubscription.id)).filter(
                        KnowledgeBaseSubscription.is_deleted == False
                    ).label('subscriber_count'),
                    func.count(distinct(ContentKnowledgeBaseMapping.id)).filter(
                        ContentKnowledgeBaseMapping.is_deleted == False,
                        content_not_deleted
                    ).label('content_count'),
                    subscription_exists
                )
                .join(User, KnowledgeBase.user_id == User.id)
                .outerjoin(
                    KnowledgeBaseSubscription,
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .outerjoin(
                    ContentKnowledgeBaseMapping,
                    and_(
                        ContentKnowledgeBaseMapping.knowledge_base_id == KnowledgeBase.id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
                .outerjoin(
                    Content,
                    ContentKnowledgeBaseMapping.content_id == Content.id
                )
                .where(and_(*conditions))
                .group_by(KnowledgeBase.id, User.id)
                .offset(offset)
                .limit(limit)
                .order_by(KnowledgeBase.created_at.desc())
            )
            result = await session.execute(query)
            knowledge_bases = result.all()
            datas = [
                {
                    'uid': kb[0].uid,
                    'name': kb[0].name,
                    'description': kb[0].description,
                    'visibility': kb[0].visibility,
                    'created_at': kb[0].created_at,
                    'updated_at': kb[0].updated_at,
                    'user_uid': kb[1],
                    'user_name': kb[2],
                    'user_picture': kb[3],
                    'subscriber_count': kb[4],
                    'content_count': kb[5],
                    'owned': kb[0].user_id == current_user_id if current_user_id else False,
                    'subscribed': kb[6]
                }
                for kb in knowledge_bases
            ]
            return datas, total

    @staticmethod
    @require_user(default_return=None)
    async def update(
        kb_id: int,
        name: str = None,
        user_id: int = None,
        description: str = None,
        visibility: KnowledgeBaseVisibility = None
    ) -> Optional[Tuple[KnowledgeBase, Optional[str]]]:
        """
        更新知识库信息
        
        Args:
            kb_id: 知识库ID
            name: 新名称
            user_id: 用户ID
            description: 新描述
            visibility: 新的可见性设置
            
        Returns:
            Tuple[KnowledgeBase, Optional[str]]: 更新后的知识库对象和错误信息（如果有）
        """
        async with get_async_session() as session:
            # 获取知识库
            kb = await session.execute(
                select(KnowledgeBase).where(
                    and_(
                        KnowledgeBase.id == kb_id,
                        KnowledgeBase.user_id == user_id,
                        KnowledgeBase.is_deleted == False
                    )
                )
            )
            kb = kb.scalar()
            if not kb:
                return None, "Knowledge base not found"

            # 如果要更改可见性
            if visibility is not None and visibility != kb.visibility:
                # 如果要改为 private，需要检查是否有订阅者
                if visibility == KnowledgeBaseVisibility.private:
                    # 获取订阅者数量
                    subscriber_count = await session.execute(
                        select(func.count())
                        .select_from(KnowledgeBaseSubscription)
                        .where(
                            and_(
                                KnowledgeBaseSubscription.knowledge_base_id == kb_id,
                                KnowledgeBaseSubscription.is_deleted == False
                            )
                        )
                    )
                    subscriber_count = subscriber_count.scalar()
                    
                    # 如果有订阅者，不允许改为 private
                    if subscriber_count > 0:
                        return kb, "Cannot change visibility to private when there are subscribers"

            # 更新字段
            if name is not None:
                kb.name = name
            if description is not None:
                kb.description = description
            if visibility is not None:
                kb.visibility = visibility

            await session.commit()
            await session.refresh(kb)
            return kb, None

    @staticmethod
    @require_user(default_return=None)
    async def delete(kb_id: int, user_id: int) -> bool:
        async with get_async_session() as session:
            kb = await session.execute(
                select(KnowledgeBase).where(
                    and_(
                        KnowledgeBase.id == kb_id,
                        KnowledgeBase.user_id ==  user_id,
                        KnowledgeBase.is_deleted == False
                    )
                )
            )
            kb = kb.scalar()
            if not kb:
                return False

            kb.is_deleted = True
            await session.commit()
            return True

    @staticmethod
    async def verify_ownership(kb_uid: str, user_id: int) -> Optional[KnowledgeBase]:
        """
        验证知识库是否属于指定用户
        
        Args:
            kb_uid: 知识库的 UID
            user_id: 用户ID
            
        Returns:
            Optional[KnowledgeBase]: 如果知识库属于该用户则返回知识库对象，否则返回 None
        """
        async with get_async_session() as session:
            query = (
                select(KnowledgeBase)
                .where(
                    and_(
                        KnowledgeBase.uid == kb_uid,
                        KnowledgeBase.user_id == user_id,
                        KnowledgeBase.is_deleted == False
                    )
                )
            )
            result = await session.execute(query)
            return result.scalar_one_or_none()

    @staticmethod
    async def check_subscription(kb_uid: str, user_id: int) -> Optional[KnowledgeBase]:
        """
        检查用户是否已订阅知识库，并返回知识库信息
        
        Args:
            kb_uid: 知识库的 UID
            user_id: 用户 ID
            
        Returns:
            Optional[KnowledgeBase]: 如果知识库存在且用户已订阅则返回知识库对象，否则返回 None
        """
        async with get_async_session() as session:
            # 首先检查知识库是否存在
            kb = await session.execute(
                select(KnowledgeBase).where(
                    and_(
                        KnowledgeBase.uid == kb_uid,
                        KnowledgeBase.is_deleted == False
                    )
                )
            )
            kb = kb.scalar_one_or_none()
            if not kb:
                return None

            # 检查订阅状态
            result = await session.execute(
                select(KnowledgeBaseSubscription).where(
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == kb.id,
                        KnowledgeBaseSubscription.user_id == user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
            )
            return kb if result.first() is not None else None

    @staticmethod
    @require_user(default_return=[])
    async def get_kb_contents_from_owned_and_subscribed() -> List[Content]:
        """
        获取用户拥有和订阅的所有知识库中的内容
        
        Args:
            user_id: 用户ID
            
        Returns:
            List[Content]: 内容对象列表
        """
        user = context_user.get()
        user_id = user.id 
        
        # 使用三个分离的会话进行查询，避免事务中止导致后续查询失败
        try:
            # 步骤1：获取知识库IDs
            kb_ids = await KnowledgeBaseRepository._get_user_knowledge_base_ids(user_id)
            if not kb_ids:
                return []
                
            # 步骤2：获取内容IDs
            content_ids = await KnowledgeBaseRepository._get_content_ids_by_kb_ids(kb_ids)
            if not content_ids:
                return []
                
            # 步骤3：获取内容
            contents = await KnowledgeBaseRepository._get_contents_by_ids(content_ids)
            return contents
            
        except Exception as e:
            logger.error(f"Error in get_kb_contents_from_owned_and_subscribed: {str(e)}")
            return []
            
    @staticmethod
    async def _get_user_knowledge_base_ids(user_id: int) -> List[int]:
        """获取用户拥有和订阅的知识库IDs"""
        async with get_async_session() as session:
            try:
                # 用户拥有的知识库
                owned_query = select(KnowledgeBase.id).where(
                    and_(
                        KnowledgeBase.user_id == user_id,
                        KnowledgeBase.is_deleted == False
                    )
                )
                owned_result = await session.execute(owned_query)
                owned_kb_ids = owned_result.scalars().all()
                
                # 用户订阅的知识库
                subscribed_query = select(KnowledgeBaseSubscription.knowledge_base_id).where(
                    and_(
                        KnowledgeBaseSubscription.user_id == user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                ).join(
                    KnowledgeBase,
                    and_(
                        KnowledgeBase.id == KnowledgeBaseSubscription.knowledge_base_id,
                        KnowledgeBase.is_deleted == False
                    )
                )
                subscribed_result = await session.execute(subscribed_query)
                subscribed_kb_ids = subscribed_result.scalars().all()
                
                # 合并并去重
                all_kb_ids = list(set(owned_kb_ids) | set(subscribed_kb_ids))
                return all_kb_ids
            except Exception as e:
                logger.error(f"Error getting knowledge base IDs: {str(e)}")
                return []
    
    @staticmethod
    async def _get_content_ids_by_kb_ids(kb_ids: List[int]) -> List[int]:
        """获取知识库中的内容IDs"""
        async with get_async_session() as session:
            try:
                query = select(ContentKnowledgeBaseMapping.content_id).where(
                    and_(
                        ContentKnowledgeBaseMapping.knowledge_base_id.in_(kb_ids),
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                ).distinct()
                
                result = await session.execute(query)
                return result.scalars().all()
            except Exception as e:
                logger.error(f"Error getting content IDs: {str(e)}")
                return []
    
    @staticmethod
    async def _get_contents_by_ids(content_ids: List[int]) -> List[Content]:
        """获取内容详情"""
        async with get_async_session() as session:
            try:
                query = select(Content).where(
                    and_(
                        Content.id.in_(content_ids),
                        Content.is_deleted == False,
                        Content.dataset_id.is_not(None),
                        Content.dataset_doc_id.is_not(None)
                    )
                )
                
                result = await session.execute(query)
                return list(result.scalars().all())
            except Exception as e:
                logger.error(f"Error getting contents: {str(e)}")
                return []

    @staticmethod
    async def get_knowledge_bases_by_content_or_user(content_id: int = None, user_id: int = None) -> List[dict]:
        """
        根据内容ID或用户ID查询相关的知识库基础信息
        
        Args:
            content_id: 内容ID (可选)
            user_id: 用户ID (可选)
            
        Returns:
            List[dict]: 知识库基础信息列表 (uid, name)
        """
        if content_id is None and user_id is None:
            return []

        async with get_async_session() as session:
            # 构建基础查询，只选择需要的字段
            query = select(
                KnowledgeBase.uid,
                KnowledgeBase.name
            )

            # Define joins needed
            needs_content_mapping_join = content_id is not None
            needs_content_join = content_id is not None # Need content table to filter by is_deleted

            # Add joins if needed
            if needs_content_mapping_join:
                query = query.join(
                    ContentKnowledgeBaseMapping,
                    KnowledgeBase.id == ContentKnowledgeBaseMapping.knowledge_base_id
                )
            if needs_content_join:
                 query = query.join(
                    Content,
                    ContentKnowledgeBaseMapping.content_id == Content.id # Join Content via the mapping table
                 )

            # Build where conditions
            where_conditions = [KnowledgeBase.is_deleted == False]

            if content_id is not None:
                where_conditions.append(ContentKnowledgeBaseMapping.content_id == content_id)
                where_conditions.append(ContentKnowledgeBaseMapping.is_deleted == False)
                where_conditions.append(Content.is_deleted == False)

            if user_id is not None:
                where_conditions.append(KnowledgeBase.user_id == user_id)

            # Add conditions and order by
            query = query.where(and_(*where_conditions)) \
                        .order_by(KnowledgeBase.created_at.desc())

            result = await session.execute(query)
            knowledge_bases = result.all()

            return [
                {
                    'uid': kb[0],
                    'name': kb[1]
                }
                for kb in knowledge_bases
            ]

    @staticmethod
    async def get_knowledge_bases_by_uids(kb_uids: List[str]) -> List[KnowledgeBase]:
        """
        通过多个知识库UID批量获取知识库信息
        
        Args:
            kb_uids: 知识库UID列表
            
        Returns:
            List[KnowledgeBase]: 知识库对象列表
        """
        if not kb_uids:
            return []
            
        async with get_async_session() as session:
            # 查询条件：知识库存在且未删除
            query = select(
                KnowledgeBase
            ).where(
                and_(
                    KnowledgeBase.uid.in_(kb_uids),
                    KnowledgeBase.is_deleted == False
                )
            )
            
            result = await session.execute(query)
            return result.scalars().all()

class KnowledgeBaseAccessRepository:
    @staticmethod
    @require_user(default_return=None)
    async def grant_access(
        kb_id: int,
        user_id: int,
        created_by: int
    ) -> KnowledgeBaseAccess:
        async with get_async_session() as session:
            access = KnowledgeBaseAccess(
                knowledge_base_id=kb_id,
                user_id=user_id,
                created_by=created_by
            )
            session.add(access)
            await session.commit()
            await session.refresh(access)
            return access

    @staticmethod
    @require_user(default_return=None)
    async def revoke_access(
        kb_id: int,
        user_id: int,
        revoked_by: int
    ) -> bool:
        async with get_async_session() as session:
            result = await session.execute(
                select(KnowledgeBaseAccess).where(
                    and_(
                        KnowledgeBaseAccess.knowledge_base_id == kb_id,
                        KnowledgeBaseAccess.user_id == user_id,
                        KnowledgeBaseAccess.is_active == True
                    )
                )
            )
            access = result.scalar()
            if not access:
                return False

            access.is_active = False
            access.revoked_at = func.now()
            access.revoked_by = revoked_by
            await session.commit()
            return True


class ContentKnowledgeBaseMappingRepository:
    @staticmethod
    async def add_contents(
        content_ids: List[int],
        kb_id: int,
        user_id: int
    ) -> int:
        async with get_async_session() as session:
            # 获取所有相关的映射（包括已删除的）
            result = await session.execute(
                select(ContentKnowledgeBaseMapping).where(
                    and_(
                        ContentKnowledgeBaseMapping.content_id.in_(content_ids),
                        ContentKnowledgeBaseMapping.knowledge_base_id == kb_id
                    )
                )
            )
            existing_mappings = {mapping.content_id: mapping for mapping in result.scalars()}

            # 处理每个内容
            for content_id in content_ids:
                if content_id in existing_mappings:
                    # 如果映射存在，恢复它
                    mapping = existing_mappings[content_id]
                    if mapping.is_deleted:
                        mapping.is_deleted = False
                        mapping.deleted_at = None
                        mapping.deleted_by = None
                        mapping.created_by = user_id
                else:
                    # 如果映射不存在，创建新的
                    mapping = ContentKnowledgeBaseMapping(
                        content_id=content_id,
                        knowledge_base_id=kb_id,
                        created_by=user_id
                    )
                    session.add(mapping)

            await session.commit()
            return len(content_ids)

    @staticmethod
    async def add_content(
        content_id: int,
        kb_id: int,
        user_id: int
    ) -> ContentKnowledgeBaseMapping:
        async with get_async_session() as session:
            # 先检查是否已存在任何映射（包括已删除的）
            existing = await session.execute(
                select(ContentKnowledgeBaseMapping).where(
                    and_(
                        ContentKnowledgeBaseMapping.content_id == content_id,
                        ContentKnowledgeBaseMapping.knowledge_base_id == kb_id
                    )
                )
            )
            existing_mapping = existing.scalar()
            
            # 如果已经存在映射
            if existing_mapping:
                # 检查是否需要恢复删除的映射
                if existing_mapping.is_deleted:
                    existing_mapping.is_deleted = False
                    existing_mapping.deleted_at = None
                    existing_mapping.deleted_by = None
                    existing_mapping.created_by = user_id
                    await session.commit()
                    await session.refresh(existing_mapping)
                return existing_mapping

            # 如果不存在，创建新映射
            mapping = ContentKnowledgeBaseMapping(
                content_id=content_id,
                knowledge_base_id=kb_id,
                created_by=user_id
            )
            session.add(mapping)
            await session.commit()
            await session.refresh(mapping)
            return mapping

    @staticmethod
    async def remove_content(
        content_id: int,
        kb_id: int,
        user_id: int
    ) -> bool:
        async with get_async_session() as session:
            result = await session.execute(
                select(ContentKnowledgeBaseMapping).where(
                    and_(
                        ContentKnowledgeBaseMapping.content_id == content_id,
                        ContentKnowledgeBaseMapping.knowledge_base_id == kb_id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
            )
            mapping = result.scalar()
            if not mapping:
                return False

            mapping.is_deleted = True
            mapping.deleted_at = func.now()
            mapping.deleted_by = user_id
            await session.commit()
            return True

    
    @staticmethod
    async def get_knowledge_base_contents(
        kb_id: int,
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[int], int]:
        async with get_async_session() as session:
            base_condition = and_(
                ContentKnowledgeBaseMapping.knowledge_base_id == kb_id,
                ContentKnowledgeBaseMapping.is_deleted == False
            )
            # 新增：内容未被删除
            content_not_deleted = Content.is_deleted == False

            # 统计总数时也要关联 content 表
            count_query = select(func.count()).select_from(ContentKnowledgeBaseMapping).join(
                Content, ContentKnowledgeBaseMapping.content_id == Content.id
            ).where(and_(base_condition, content_not_deleted))
            total = await session.execute(count_query)
            total = total.scalar()

            query = (
                select(ContentKnowledgeBaseMapping.content_id)
                .join(Content, ContentKnowledgeBaseMapping.content_id == Content.id)
                .where(and_(base_condition, content_not_deleted))
                .offset(offset)
                .limit(limit)
                .order_by(ContentKnowledgeBaseMapping.created_at.desc())
            )
            result = await session.execute(query)
            content_ids = result.scalars().all()

            return list(content_ids), total

    @staticmethod
    async def get_knowledge_base_all_contents(
        kb_id: int,
    ) -> Tuple[List[int], int]:
        async with get_async_session() as session:
            base_condition = and_(
                ContentKnowledgeBaseMapping.knowledge_base_id == kb_id,
                ContentKnowledgeBaseMapping.is_deleted == False
            )
            

            query = (
                select(ContentKnowledgeBaseMapping.content_id)
                .where(base_condition)
                .order_by(ContentKnowledgeBaseMapping.created_at.desc())
            )
            result = await session.execute(query)
            content_ids = result.scalars().all()

            return list(content_ids)

    @staticmethod
    async def get_available_contents(kb_id: int, user_id: int) -> List[dict]:
        """
        获取用户所有可添加到知识库的内容列表
        
        Args:
            kb_id: 知识库ID
            user_id: 用户ID
            
        Returns:
            List[dict]: 包含内容信息和是否已添加到知识库的列表
        """
        async with get_async_session() as session:
            # 主查询：获取用户的所有已完成内容，并检查是否已添加到知识库
            query = (
                select(
                    Content.uid,
                    Content.title,
                    Content.media_type,
                    func.exists(
                        select(1)
                        .where(
                            and_(
                                ContentKnowledgeBaseMapping.content_id == Content.id,
                                ContentKnowledgeBaseMapping.knowledge_base_id == kb_id,
                                ContentKnowledgeBaseMapping.is_deleted == False
                            )
                        )
                    ).label('is_in_knowledge_base')
                )
                .where(
                    and_(
                        Content.user_id == user_id,
                        Content.processing_status == ProcessingStatus.COMPLETED,
                        Content.is_deleted == False
                    )
                )
                .order_by(Content.created_at.desc())
            )

            result = await session.execute(query)
            contents = result.all()
            
            return [
                {
                    "uid": content.uid,
                    "title": content.title,
                    "media_type": content.media_type,
                    "is_in_knowledge_base": content.is_in_knowledge_base
                }
                for content in contents
            ]

    @staticmethod
    async def remove_contents(
        content_ids: List[int],
        kb_id: int,
        user_id: int
    ) -> int:
        async with get_async_session() as session:
            # 获取所有需要移除的映射
            result = await session.execute(
                select(ContentKnowledgeBaseMapping).where(
                    and_(
                        ContentKnowledgeBaseMapping.content_id.in_(content_ids),
                        ContentKnowledgeBaseMapping.knowledge_base_id == kb_id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
            )
            mappings = result.scalars().all()

            # 批量标记为已删除
            for mapping in mappings:
                mapping.is_deleted = True
                mapping.deleted_at = func.now()
                mapping.deleted_by = user_id

            await session.commit()
            return len(mappings)
            

class KnowledgeBaseSubscriptionRepository:
    @staticmethod
    async def delete_subscription(kb_id: int, user_id: int) -> bool:
        """
        删除知识库订阅（软删除）
        
        Args:
            kb_id: 知识库ID
            user_id: 用户ID
            
        Returns:
            bool: 是否成功删除订阅
        """
        async with get_async_session() as session:
            result = await session.execute(
                select(KnowledgeBaseSubscription).where(
                    and_(
                        KnowledgeBaseSubscription.knowledge_base_id == kb_id,
                        KnowledgeBaseSubscription.user_id == user_id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
            )
            subscription = result.scalar()
            if not subscription:
                return False

            subscription.is_deleted = True
            subscription.deleted_at = func.now()
            subscription.deleted_by = user_id
            await session.commit()
            return True

    @staticmethod
    async def get_user_subscriptions(user_id: int, offset: int = 0, limit: int = 20) -> Tuple[List[KnowledgeBase], int]:
        """
        获取用户的知识库订阅列表
        
        Args:
            user_id: 用户ID
            offset: 分页偏移
            limit: 每页数量
            
        Returns:
            Tuple[List[KnowledgeBase], int]: 订阅的知识库列表和总数
        """
        async with get_async_session() as session:
            # 构建基础条件
            conditions = and_(
                KnowledgeBaseSubscription.user_id == user_id,
                KnowledgeBaseSubscription.is_deleted == False,
                KnowledgeBase.is_deleted == False
            )

            # 计算总数
            count_query = (
                select(func.count())
                .select_from(KnowledgeBaseSubscription)
                .join(KnowledgeBase, KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id)
                .where(conditions)
            )
            total = await session.execute(count_query)
            total = total.scalar()

            # 创建一个订阅表的别名用于统计
            subs_alias = KnowledgeBaseSubscription.__table__.alias('subs')

            # 获取知识库列表，包括用户信息和统计数据
            query = (
                select(
                    KnowledgeBase,
                    User.uid.label('user_uid'),
                    User.name.label('user_name'),
                    User.picture.label('user_picture'),
                    func.count(distinct(subs_alias.c.id)).filter(
                        subs_alias.c.is_deleted == False
                    ).label('subscriber_count'),
                    func.count(distinct(ContentKnowledgeBaseMapping.id)).filter(
                        ContentKnowledgeBaseMapping.is_deleted == False
                    ).label('content_count'),
                    func.max(KnowledgeBaseSubscription.created_at).label('subscription_created_at')
                )
                .select_from(KnowledgeBaseSubscription)
                .join(KnowledgeBase, KnowledgeBaseSubscription.knowledge_base_id == KnowledgeBase.id)
                .join(User, KnowledgeBase.user_id == User.id)
                .outerjoin(
                    subs_alias,
                    and_(
                        subs_alias.c.knowledge_base_id == KnowledgeBase.id,
                        subs_alias.c.is_deleted == False
                    )
                )
                .outerjoin(
                    ContentKnowledgeBaseMapping,
                    and_(
                        ContentKnowledgeBaseMapping.knowledge_base_id == KnowledgeBase.id,
                        ContentKnowledgeBaseMapping.is_deleted == False
                    )
                )
                .where(conditions)
                .group_by(KnowledgeBase.id, User.id)
                .order_by(text('subscription_created_at DESC'))
                .offset(offset)
                .limit(limit)
            )
            
            result = await session.execute(query)
            knowledge_bases = result.all()
            
            return [
                {
                    'uid': kb[0].uid,
                    'name': kb[0].name,
                    'description': kb[0].description,
                    'visibility': kb[0].visibility,
                    'created_at': kb[0].created_at,
                    'updated_at': kb[0].updated_at,
                    'user_uid': kb[1],
                    'user_name': kb[2],
                    'user_picture': kb[3],
                    'subscriber_count': kb[4],
                    'content_count': kb[5],
                    'owned': kb[0].user_id == user_id,  # 检查是否是自己的知识库
                    'subscribed': True  # 这是订阅列表，所以一定是已订阅的
                }
                for kb in knowledge_bases
            ], total

    @staticmethod
    async def get_subscribers(kb_id: int, offset: int = 0, limit: int = 20) -> Tuple[List[str], int]:
        """
        获取知识库的订阅者列表
        
        Args:
            kb_id: 知识库ID
            offset: 分页偏移
            limit: 每页数量
            
        Returns:
            Tuple[List[str], int]: 订阅者的 UID 列表和总数
        """
        async with get_async_session() as session:
            # 构建基础条件
            conditions = and_(
                KnowledgeBaseSubscription.knowledge_base_id == kb_id,
                KnowledgeBaseSubscription.is_deleted == False
            )

            # 计算总数
            count_query = select(func.count()).select_from(KnowledgeBaseSubscription).where(conditions)
            total = await session.execute(count_query)
            total = total.scalar()

            # 获取订阅者列表
            query = (
                select(User.uid)
                .join(
                    KnowledgeBaseSubscription,
                    and_(
                        KnowledgeBaseSubscription.user_id == User.id,
                        KnowledgeBaseSubscription.is_deleted == False
                    )
                )
                .where(conditions)
                .order_by(KnowledgeBaseSubscription.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
            
            result = await session.execute(query)
            subscriber_uids = result.scalars().all()
            
            return list(subscriber_uids), total

    @staticmethod
    async def create_subscription(kb_id: int, user_id: int) -> bool:
        """
        创建知识库订阅
        
        Args:
            kb_id: 知识库ID
            user_id: 用户ID
            
        Returns:
            bool: 是否成功创建订阅
        """
        async with get_async_session() as session:
            try:
                # 检查是否存在任何订阅记录（包括已删除的）
                existing = await session.execute(
                    select(KnowledgeBaseSubscription).where(
                        and_(
                            KnowledgeBaseSubscription.knowledge_base_id == kb_id,
                            KnowledgeBaseSubscription.user_id == user_id
                        )
                    )
                )
                subscription = existing.scalar_one_or_none()
                
                if subscription:
                    # 如果存在订阅记录
                    if not subscription.is_deleted:
                        # 如果已经是活跃订阅，直接返回 True
                        return True
                    # 如果是已删除的订阅，恢复它
                    subscription.is_deleted = False
                    subscription.deleted_at = None
                    subscription.deleted_by = None
                    await session.commit()
                    return True  # 返回成功（恢复的订阅）
                
                # 如果不存在任何订阅记录，创建新的
                new_subscription = KnowledgeBaseSubscription(
                    knowledge_base_id=kb_id,
                    user_id=user_id
                )
                session.add(new_subscription)
                await session.commit()
                return True
                
            except Exception as e:
                await session.rollback()
                return False


knowledge_base_repository = KnowledgeBaseRepository
knowledge_base_access_repository = KnowledgeBaseAccessRepository
content_kb_mapping_repository = ContentKnowledgeBaseMappingRepository
knowledge_base_subscription_repository = KnowledgeBaseSubscriptionRepository