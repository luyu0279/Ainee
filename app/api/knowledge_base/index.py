from enum import Enum
import logging
from fastapi import APIRouter, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple
import nanoid
from datetime import datetime
from app.api.content.index import ContentResponse, process_content_for_list
from app.api.user.index import get_default_avatar, get_default_nickname
from app.database.models.knowledge_base import (
    KnowledgeBase,
    KnowledgeBaseVisibility,
)
from app import (
    settings)
from app.database.repositories.content_repository import content_repository
from app.database.repositories.knowledge_base_repository import (
    knowledge_base_repository,
    content_kb_mapping_repository,
    knowledge_base_subscription_repository,
)
from app.context import context_user
from app.common import CommonResponse, success, failed
from app.database.models.content import ContentMediaType
from app.database.models.content import ProcessingStatus
from app.database.users_dao import user_repository
from app.services.youtube_audio_file_service import YouTubeAudioFileService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/kb", tags=["Knowledge Base"])

class KnowledgeBaseType(str, Enum):
    owned = "owned"
    subscribed = "subscribed"
    all = "all"

class CreateKnowledgeBaseRequest(BaseModel):
    name: str = Field(..., description="Knowledge base name")
    description: Optional[str] = Field(None, description="Knowledge base description")
    visibility: KnowledgeBaseVisibility = Field(
        default=KnowledgeBaseVisibility.private, description="Knowledge base visibility"
    )


class KnowledgeBaseResponse(BaseModel):
    uid: str
    name: str
    description: Optional[str]
    visibility: KnowledgeBaseVisibility
    created_at: datetime
    updated_at: datetime
    # User information
    user_uid: Optional[str] = Field(None)
    user_name: Optional[str] = Field(None)
    user_picture: Optional[str] = Field(None)
    # Stats
    subscriber_count: int = 0
    content_count: int = 0
    # Relationship flags
    owned: bool
    subscribed: bool
    share_page_url: Optional[str] = Field(None, description="Knowledge base share page URL")


class UpdateKnowledgeBaseRequest(BaseModel):
    kb_uid: str = Field(..., description="Knowledge base UID")
    name: Optional[str] = Field(None, description="Knowledge base name")
    description: Optional[str] = Field(None, description="Knowledge base description")
    visibility: Optional[KnowledgeBaseVisibility] = Field(None, description="Knowledge base visibility")


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: List[KnowledgeBaseResponse]
    total: int


class ContentToKnowledgeBaseRequest(BaseModel):
    content_uids: list[str] = Field(..., description="多个内容UID")
    kb_uid: str = Field(..., description="知识库UID")


class AvailableContentResponse(BaseModel):
    uid: str
    title: Optional[str]
    media_type: ContentMediaType
    is_in_knowledge_base: bool


class SubscriptionListResponse(BaseModel):
    knowledge_bases: List[KnowledgeBaseResponse]
    total: int


class SubscriberListResponse(BaseModel):
    subscriber_uids: List[str]
    total: int


def include_share_page_url(kb: dict) -> dict:
    """
    Conditionally include the share_page_url based on the visibility of the knowledge base.
    """
    share_url = f"{settings.kb_share_page_url}/kb/{kb['uid']}"
    return {
        **kb,
        'share_page_url': share_url if kb['visibility'] in ['default', 'public'] else None,
        'user_name': get_default_nickname(kb['user_name'], kb['user_uid']),
        'user_picture': get_default_avatar(kb['user_picture'])
    }



@router.post(
    "/update",
    response_model=CommonResponse[Optional[KnowledgeBaseResponse]],
    summary="Update knowledge base",
)
async def update_knowledge_base(request: UpdateKnowledgeBaseRequest):
    try:
        user = context_user.get()
        # First verify ownership
        kb = await knowledge_base_repository.verify_ownership(
            kb_uid=request.kb_uid,
            user_id=user.id
        )
        if not kb:
            return failed("Knowledge base not found or no permission")

        # Update knowledge base
        updated_kb, error_msg = await knowledge_base_repository.update(
            kb_id=kb.id,
            user_id=user.id,
            name=request.name,
            description=request.description,
            visibility=request.visibility,
        )
        
        if error_msg:
            return failed(error_msg)
                
        return success(data=KnowledgeBaseResponse.model_validate({
            **updated_kb.__dict__,
            "uid": updated_kb.uid,
            "user_uid": user.uid,
            "user_name": get_default_nickname(user.name, user.uid) ,
            "user_picture": get_default_avatar(user.picture)  ,
            "subscriber_count": 0,
            "content_count": 0,
            "owned": True,
            "subscribed": False,
            "share_page_url": None
        }))
    except Exception as e:
        logger.error(f"Failed to update knowledge base: {str(e)}")
        return failed("Failed to update knowledge base")


@router.post(
    "/create",
    response_model=CommonResponse[Optional[KnowledgeBaseResponse]],
    summary="Create knowledge base",
)
async def save_knowledge_base(request: CreateKnowledgeBaseRequest):
    try:
        user = context_user.get()
        kb = await knowledge_base_repository.create(
            name=request.name,
            user_id=user.id,
            description=request.description,
            visibility=request.visibility,
        )
        return success(data=KnowledgeBaseResponse.model_validate({
            **kb.__dict__,
            "uid": kb.uid,
            "user_uid": user.uid,
            "user_name": get_default_nickname(user.name, user.uid),
            "user_picture": get_default_avatar(user.picture),
            "subscriber_count": 0,
            "content_count": 0,
            "owned": True,
            "subscribed": False,
            "share_page_url": None
        }))
    except Exception as e:
        logger.error(f"Failed to create knowledge base: {str(e)}")
        return failed("Failed to create knowledge base")
    

@router.get(
    "/list/own",
    response_model=CommonResponse[Optional[KnowledgeBaseListResponse]],
    summary="Get current user's knowledge base list",
)
async def get_knowledge_base_list(
    type: KnowledgeBaseType,
    offset: int = 0,
    limit: int = 20
):
    try:
        logger.info(f"Getting knowledge base list for type: {type}, offset: {offset}, limit: {limit}")
        current_user = context_user.get()
        
        if type == KnowledgeBaseType.owned:
            if not current_user:
                return failed("User not logged in")
            knowledge_bases, total = await knowledge_base_repository.get_own_knowledge_bases(
                offset=offset,
                limit=limit,
            )
        
        elif type == KnowledgeBaseType.subscribed:
            if not current_user:
                return failed("User not logged in")
            knowledge_bases, total = await knowledge_base_subscription_repository.get_user_subscriptions(
                user_id=current_user.id,
                offset=offset,
                limit=limit,
            )
        
        elif type == KnowledgeBaseType.all:
            if not current_user:
                return failed("User not logged in")
                
            # First get total counts
            _, owned_total = await knowledge_base_repository.get_own_knowledge_bases(
                offset=0,
                limit=1
            )
            
            _, subscribed_total = await knowledge_base_subscription_repository.get_user_subscriptions(
                user_id=current_user.id,
                offset=0,
                limit=1
            )
            
            # Get all owned knowledge bases
            owned_kbs = []
            if owned_total > 0:
                owned_kbs, _ = await knowledge_base_repository.get_own_knowledge_bases(
                    offset=0,
                    limit=owned_total
                )
            
            # Get all subscribed knowledge bases
            subscribed_kbs = []
            if subscribed_total > 0:
                subscribed_kbs, _ = await knowledge_base_subscription_repository.get_user_subscriptions(
                    user_id=current_user.id,
                    offset=0,
                    limit=subscribed_total
                )
            
            # Combine both lists and remove duplicates (if any)
            all_kbs = list({kb['uid']: kb for kb in owned_kbs + subscribed_kbs}.values())
            
            # Apply pagination after combining
            total = len(all_kbs)
            start_idx = offset
            end_idx = min(offset + limit, total)
            knowledge_bases = all_kbs[start_idx:end_idx]
        
        return success(
            data=KnowledgeBaseListResponse(
                knowledge_bases=[
                    KnowledgeBaseResponse.model_validate(include_share_page_url(kb))
                    for kb in knowledge_bases
                ],
                total=total,
            )
        )
    except Exception as e:
        logger.error(f"Failed to get knowledge base list: {str(e)}")
        return failed("Failed to get knowledge base list") 

@router.get(
    "/list/explore",
    response_model=CommonResponse[Optional[KnowledgeBaseListResponse]],
    summary="Explore knowledge base list",
)
async def get_others_knowledge_base_list(
    offset: int = 0,
    limit: int = 20,
):
    try:
        knowledge_bases, total = await knowledge_base_repository.get_others_knowledge_bases(
            offset=offset,
            limit=limit,
        )

        return success(
            data=KnowledgeBaseListResponse(
                knowledge_bases=[
                    KnowledgeBaseResponse.model_validate(include_share_page_url(kb))
                    for kb in knowledge_bases
                ],
                total=total,
            )
        )
    except Exception as e:
        logger.error(f"Failed to get others knowledge base list: {str(e)}")
        return failed("Failed to get others knowledge base list")

@router.get(
    "/get_detail",
    response_model=CommonResponse[Optional[KnowledgeBaseResponse]],
    summary="Get knowledge base details",
)
async def get_knowledge_base_detail(kb_uid: str):
    try:
        user = context_user.get()
        kb = await knowledge_base_repository.get_kb_detail_with_access_check(
            kb_uid=kb_uid,
            user_id=user.id if user else None
        )
        if not kb:
            return failed("Knowledge base not found or no permission to access")
        return success(data=KnowledgeBaseResponse.model_validate(include_share_page_url(kb)))
    except Exception as e:
        logger.error(f"Failed to get knowledge base: {str(e)}")
        return failed("Failed to get knowledge base")

@router.post(
    "/delete",
    response_model=CommonResponse[Optional[bool]],
    summary="Delete knowledge base",
)
async def delete_knowledge_base(kb_uid: str):
    try:
        user = context_user.get()
        # 首先验证所有权
        kb = await knowledge_base_repository.verify_ownership(
            kb_uid=kb_uid,
            user_id=user.id
        )
        if not kb:
            return failed("Knowledge base not found or no permission")

        # 执行删除
        result = await knowledge_base_repository.delete(kb_id=kb.id, user_id=user.id)
        return success(data=True)
    except Exception as e:
        logger.error(f"Failed to delete knowledge base: {str(e)}")
        return failed("Failed to delete knowledge base")


@router.post(
    "/add_contents",
    response_model=CommonResponse[Optional[dict]],
    summary="Batch add content to knowledge base",
)
async def add_contents_to_kb(request: ContentToKnowledgeBaseRequest):
    try:
        user = context_user.get()
        # Verify if knowledge base belongs to current user
        kb = await knowledge_base_repository.verify_ownership(
            kb_uid=request.kb_uid,
            user_id=user.id
        )
        if not kb:
            return failed("Knowledge base not found or no permission")

        if request.content_uids is None or len(request.content_uids) == 0:
            return failed("No content to add")

        # Deduplicate
        unique_content_uids = list(set(request.content_uids))

        # Batch get all content
        contents = await content_repository.get_by_uids(unique_content_uids)
        
        # Get all content IDs
        content_ids = [content.id for content in contents if content]

        # Use add_contents method to batch add
        added_count = await content_kb_mapping_repository.add_contents(
            content_ids=content_ids,
            kb_id=kb.id,
            user_id=user.id
        )
        
        # 更新知识库的更新时间
        if added_count > 0:
            await knowledge_base_repository.update(
                kb_id=kb.id,
                user_id=user.id,
            )

        return success(data={
            "total": len(unique_content_uids),
            "added": added_count,
        })

    except Exception as e:
        logger.error(f"Failed to add contents to knowledge base: {str(e)}")
        return failed("Failed to add contents to knowledge base")


@router.post(
    "/remove_content",
    response_model=CommonResponse[Optional[dict]],
    summary="Batch remove content from knowledge base",
)
async def remove_content_from_kb(request: ContentToKnowledgeBaseRequest):
    try:
        user = context_user.get()
        # Verify if knowledge base belongs to current user
        kb = await knowledge_base_repository.verify_ownership(
            kb_uid=request.kb_uid,
            user_id=user.id
        )
        if not kb:
            return failed("Knowledge base not found or no permission")

        if request.content_uids is None or len(request.content_uids) == 0:
            return failed("No content to remove")

        # Deduplicate
        unique_content_uids = list(set(request.content_uids))

        # Batch get all content
        contents = await content_repository.get_by_uids(unique_content_uids)
        
        # Get all content IDs
        content_ids = [content.id for content in contents if content]

        logger.info(f"content_ids: {content_ids}")

        # Use remove_contents method to batch remove
        removed_count = await content_kb_mapping_repository.remove_contents(
            content_ids=content_ids,
            kb_id=kb.id,
            user_id=user.id
        )
        
        # 更新知识库的更新时间
        if removed_count > 0:
            await knowledge_base_repository.update(
                kb_id=kb.id,
                user_id=user.id,
            )

        return success(data={
            "total": len(unique_content_uids),
            "removed": removed_count
        })

    except Exception as e:
        logger.error(f"Failed to remove contents from knowledge base: {str(e)}")
        return failed("Failed to remove contents from knowledge base")


@router.get(
    "/get_contents",
    response_model=CommonResponse[Optional[List[ContentResponse]]],
    summary="Get content list in knowledge base",
)
async def get_kb_contents(kb_uid: str, offset: int = 0, limit: int = 20):
    try:
        user = context_user.get()
        # 验证知识库存在且用户有权限
        kb = await knowledge_base_repository.get_basic_with_check_access(kb_uid, user_id=user.id if user else None)

        if not kb:
            return failed("Knowledge base not found")
        
        # 获取内容列表
        content_ids, total = await content_kb_mapping_repository.get_knowledge_base_contents(
            kb_id=kb.id,
            offset=offset,
            limit=limit,
        )

        contents = await content_repository.get_by_ids(content_ids)
        
        return success(data=[
            ContentResponse.model_validate(process_content_for_list(content))
            for content in contents
            if content is not None
        ])
    except Exception as e:
        logger.error(f"Failed to get knowledge base contents: {str(e)}")
        return failed("Failed to get knowledge base contents")


@router.get(
    "/available_contents/{kb_uid}",
    response_model=CommonResponse[Optional[List[AvailableContentResponse]]],
    summary="Get available content list that can be added to knowledge base",
)
async def get_available_contents(kb_uid: str):
    try:
        user = context_user.get()
        # 验证知识库是否属于当前用户
        kb = await knowledge_base_repository.verify_ownership(
            kb_uid=kb_uid,
            user_id=user.id
        )

        if not kb:
            return failed("Knowledge base not found or no permission")

        # 获取可用内容列表
        contents = await content_kb_mapping_repository.get_available_contents(
            kb_id=kb.id,
            user_id=user.id
        )
        
        return success(data=[
            AvailableContentResponse(
                uid=content["uid"],
                title=content["title"],
                media_type=content["media_type"],
                is_in_knowledge_base=content["is_in_knowledge_base"]
            )
            for content in contents
        ])
    except Exception as e:
        logger.error(f"Failed to get available contents: {str(e)}")
        return failed("Failed to get available contents")


@router.post(
    "/subscribe/{kb_uid}",
    response_model=CommonResponse[Optional[bool]],
    summary="Subscribe to a knowledge base",
)
async def subscribe_knowledge_base(kb_uid: str):
    try:
        user = context_user.get()
        if not user:
            return failed("User not logged in")

        # 验证知识库存在且用户有权限查看
        kb = await knowledge_base_repository.get_basic_with_check_access(kb_uid, user_id=user.id)
        if not kb:
            return failed("Knowledge base not found or no permission to access")
            
        if kb.user_id == user.id:
            return failed("You cannot subscribe to your own knowledge base")

        # 创建订阅
        success_flag = await knowledge_base_subscription_repository.create_subscription(
            kb_id=kb.id,
            user_id=user.id,
        )
        
        if not success_flag:
            return failed("Failed to subscribe, you might have already subscribed to this knowledge base")

        return success(data=True)
    except Exception as e:
        logger.error(f"Failed to subscribe to knowledge base: {str(e)}")
        return failed("Failed to subscribe to knowledge base")


@router.post(
    "/unsubscribe/{kb_uid}",
    response_model=CommonResponse[Optional[bool]],
    summary="Unsubscribe from a knowledge base",
)
async def unsubscribe_knowledge_base(kb_uid: str):
    try:
        user = context_user.get()
        if not user:
            return failed("User not logged in")

        # 验证知识库存在
        kb = await knowledge_base_repository.check_subscription(kb_uid, user_id=user.id)
        if not kb:
            return failed("Knowledge base not found, or you are not subscribed to it")

        # 取消订阅
        success_flag = await knowledge_base_subscription_repository.delete_subscription(
            kb_id=kb.id,
            user_id=user.id,
        )
        
        if not success_flag:
            return failed("Failed to unsubscribe, you might not have subscribed to this knowledge base")

        return success(data=True)
    except Exception as e:
        logger.error(f"Failed to unsubscribe from knowledge base: {str(e)}")
        return failed("Failed to unsubscribe from knowledge base")


# @router.get(
#     "/subscriptions",
#     response_model=CommonResponse[SubscriptionListResponse],
#     summary="Get user's knowledge base subscriptions",
# )
# async def get_subscriptions(offset: int = 0, limit: int = 20):
#     try:
#         user = context_user.get()
#         if not user:
#             return failed("User not logged in")

#         # 获取用户的订阅列表
#         knowledge_bases, total = await knowledge_base_subscription_repository.get_user_subscriptions(
#             user_id=user.id,
#             offset=offset,
#             limit=limit,
#         )

#         return success(data=SubscriptionListResponse(
#             knowledge_bases=[
#                 KnowledgeBaseResponse.model_validate(kb.__dict__)
#                 for kb in knowledge_bases
#             ],
#             total=total
#         ))
#     except Exception as e:
#         logger.error(f"Failed to get subscriptions: {str(e)}")
#         return failed("Failed to get subscriptions")


# @router.get(
#     "/subscribers/{kb_uid}",
#     response_model=CommonResponse[SubscriberListResponse],
#     summary="Get knowledge base subscribers (only for knowledge base owner)",
# )
# async def get_subscribers(kb_uid: str, offset: int = 0, limit: int = 20):
#     try:
#         user = context_user.get()
#         if not user:
#             return failed("User not logged in")

#         # 验证知识库所有权
#         kb = await knowledge_base_repository.verify_ownership(
#             kb_uid=kb_uid,
#             user_id=user.id
#         )
#         if not kb:
#             return failed("Knowledge base not found or no permission")

#         # 获取订阅者列表
#         subscriber_uids, total = await knowledge_base_subscription_repository.get_subscribers(
#             kb_id=kb.id,
#             offset=offset,
#             limit=limit,
#         )

#         return success(data=SubscriberListResponse(
#             subscriber_uids=subscriber_uids,
#             total=total
#         ))
#     except Exception as e:
#         logger.error(f"Failed to get subscribers: {str(e)}")
#         return failed("Failed to get subscribers")


# @router.post(
#     "/move_contents",
#     response_model=CommonResponse[dict],
#     summary="Move content from one knowledge base to another",
# )
# async def move_contents_between_kbs(request: ContentToKnowledgeBaseRequest, target_kb_uid: str):
#     try:
#         user = context_user.get()
        
#         # Verify if source knowledge base belongs to current user
#         source_kb = await knowledge_base_repository.verify_ownership(
#             kb_uid=request.kb_uid,
#             user_id=user.id
#         )
#         if not source_kb:
#             return failed("Source knowledge base not found or no permission")

#         # Verify if target knowledge base belongs to current user
#         target_kb = await knowledge_base_repository.verify_ownership(
#             kb_uid=target_kb_uid,
#             user_id=user.id
#         )
#         if not target_kb:
#             return failed("Target knowledge base not found or no permission")

#         if request.content_uids is None or len(request.content_uids) == 0:
#             return failed("No content to move")

#         # Deduplicate
#         unique_content_uids = list(set(request.content_uids))

#         # Batch get all content
#         contents = await content_repository.get_by_uids(unique_content_uids)
        
#         # Get all content IDs
#         content_ids = [content.id for content in contents if content]

#         # Start a transaction
#         async with database.transaction():  # Assuming you have a transaction context manager
#             # Use remove_contents method to batch remove from source KB
#             removed_count = await content_kb_mapping_repository.remove_contents(
#                 content_ids=content_ids,
#                 kb_id=source_kb.id,
#                 user_id=user.id
#             )

#             # Use add_contents method to batch add to target KB
#             added_count = await content_kb_mapping_repository.add_contents(
#                 content_ids=content_ids,
#                 kb_id=target_kb.id,
#                 user_id=user.id
#             )

#         return success(data={
#             "total": len(unique_content_uids),
#             "removed": removed_count,
#             "added": added_count,
#         })

#     except Exception as e:
#         logger.error(f"Failed to move contents between knowledge bases: {str(e)}")
#         return failed("Failed to move contents between knowledge bases")


# @router.post(
#     "/grant_access",
#     response_model=CommonResponse[bool],
#     summary="Grant user access",
# )


# @router.post(
#     "/revoke_access",
#     response_model=CommonResponse[bool],
#     summary="Revoke user access",
# ) 