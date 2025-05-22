import logging
from fastapi import APIRouter, Query
import nanoid
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.database.repositories.content_repository import content_repository
from app.database.repositories.annotation_repository import (
    annotation_repository,
)
from app.database.users_dao import user_repository
from app.database.utils import require_user
from app.context import context_user
from app.common import (
    CommonResponse,
    success,
    failed,
)
from enum import Enum

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/annotation", tags=["Annotation"])


# 请求和响应模型
class CreateAnnotationRequest(BaseModel):
    content_uid: str = Field(..., description="The ID of the content to annotate.")
    uid: str = Field(..., description="The UID of the annotation.")
    annotation_content: dict = Field(
        ..., description="The W3C-compliant annotation content."
    )


class AnnotationResponse(BaseModel):
    uid: str
    content: dict


class UserAnnotationsData(BaseModel):
    """用户注解列表的返回数据结构"""

    annotations: List[AnnotationResponse]
    next_cursor: Optional[str] = Field(None, description="下一页的游标")


class AnnotationAction(str, Enum):
    DELETE = "delete"
    UPDATE = "update"


class ManageAnnotationResponse(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful.")
    annotation: Optional[AnnotationResponse] = Field(
        None, description="The updated annotation (only for update action)."
    )


class ManageAnnotationRequest(BaseModel):
    content_uid: str = Field(..., description="The UID of the content.")
    annotation_uid: str = Field(..., description="The UID of the annotation.")
    action: AnnotationAction = Field(
        ..., description="Action to perform: 'delete' or 'update'."
    )
    annotation_content: Optional[dict] = Field(
        None,
        description="The updated annotation content (required for 'update' action).",
    )
    uid: str = Field(..., description="The UID of the request.")


class SimplifiedAnnotationResponse(BaseModel):
    uid: str
    target_content_id: Optional[int]
    content: dict
    created_at: datetime


class AnnotationWithUserResponse(BaseModel):
    content: dict
    nickname: str
    avatar: str


class AnnotationsResponse(BaseModel):
    content_uid: str
    annotations: List[dict]


@router.post(
    "/create",
    response_model=CommonResponse[AnnotationResponse],
    summary="Create Annotation",
    description="Create a new annotation for a given content.",
)
async def create_annotation(request: CreateAnnotationRequest):
    """创建注解"""
    content = await content_repository.get_by_uid(request.content_uid)

    if not content:
        return failed("Content not found")

    # 调用 repository 创建注解
    annotation = await annotation_repository.create(
        target_content_id=content.id,
        related_annotation_ids=None,  # 如果没有关联的注解，可以传入 None
        annotation_content=request.annotation_content,  # 使用前端传入的 annotation_content
        is_deleted=False,
        uid=request.uid,
    )

    if not annotation:
        return failed("Failed to create annotation")

    response_data = {
        "uid": annotation.uid,
        "target_content_id": annotation.target_content_id,
        "content": annotation.content,
        "created_at": annotation.created_at,
    }
    response = SimplifiedAnnotationResponse.model_validate(response_data)
    return success(data=response)


@router.get(
    "/content/{content_uid}",
    response_model=CommonResponse[AnnotationsResponse],
    summary="Get All Annotations for Content",
    description="Retrieve all annotations for a given content.",
)
async def get_annotations_by_content(content_uid: str):
    """获取指定文章的所有标注"""
    content = await content_repository.get_by_uid(content_uid)
    if not content:
        return success(
            data=AnnotationsResponse(content_uid=content_uid, annotations=[])
        )

    annotations = await annotation_repository.get_by_content(content.id)

    # Get user data for all annotations
    user_ids = [annotation.user_id for annotation in annotations]
    users = await user_repository.get_users_by_ids(
        user_ids
    )  # Assuming you have this method
    user_map = {user.id: user for user in users}

    return success(
        data=AnnotationsResponse(
            content_uid=content_uid,
            annotations=[
                {
                    **annotation.content,
                    "nickname": user_map[annotation.user_id].name,
                    "avatar": user_map[annotation.user_id].picture,
                    "create_time": (
                        annotation.created_at.isoformat()
                        if annotation.created_at
                        else None
                    ),
                }
                for annotation in annotations
            ],
        )
    )


@router.post(
    "/manage",
    response_model=CommonResponse[ManageAnnotationResponse],
    summary="Manage Annotation",
    description="Manage an annotation by content UID and annotation UID (delete or update).",
)
async def manage_annotation(request: ManageAnnotationRequest):
    """根据 content.uid 和 annotation.uid 管理 annotation（删除或更新）"""
    current_user_id = context_user.get().id

    # 通过 content.uid 找到 content
    content = await content_repository.get_by_uid(request.content_uid)
    if not content:
        return failed("Content not found")

    # 确保 content 属于当前用户
    if content.user_id != current_user_id:
        return failed("You do not have permission to manage this content")

    # 通过 annotation.uid 找到 annotation
    annotation = await annotation_repository.get_by_uid(request.annotation_uid)
    if not annotation:
        return failed("Annotation not found")

    # 确保 annotation 属于当前用户
    if annotation.user_id != current_user_id:
        return failed("You do not have permission to manage this annotation")

    # 确保 annotation 的 target_content_id 与 content.id 匹配
    if annotation.target_content_id != content.id:
        return failed("Annotation does not belong to the specified content")

    if request.action == AnnotationAction.DELETE:
        # 删除 annotation
        delete_success = await annotation_repository.delete_by_uid(
            request.content_uid, request.annotation_uid
        )
        if not delete_success:
            return failed("Failed to delete annotation")
        return success(data=ManageAnnotationResponse(success=True))

    elif request.action == AnnotationAction.UPDATE:
        if not request.annotation_content:
            return failed("Annotation content is required for update action")

        # 更新 annotation 的 content 字段
        annotation = await annotation_repository.update_by_uid(
            request.content_uid, request.annotation_uid, request.annotation_content
        )
        if not annotation:
            return failed("Failed to update annotation")
        return success(
            data=ManageAnnotationResponse(
                success=True,
                annotation=AnnotationResponse.model_validate(annotation.__dict__),
            )
        )

    else:
        return failed("Invalid action")
