import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, BackgroundTasks
from pydantic import BaseModel, Field
from starlette import status
import json
import hashlib
import time
import os

from app import settings
from app.common import CommonResponse, success, failed
from app.context import context_user
from app.database.repositories.annotation_repository import annotation_repository
from app.database.repositories.content_repository import content_repository
from app.database.session import Base
from app.database.users_dao import user_repository
from app.database.subscriptions import subscription_repository
from app.database.tool_web import tool_web_repository
from app.database.user_archive import user_archive_repository
from app.libs.auth.auth_utils import create_jwt_token_by_user_id
from app.api.file.file import upload_file_size_is_valid, upload_file_type_is_valid
from app.api.file.file import storage, DEFAULT_UPLOAD_PATH
import nanoid
from firebase_admin import messaging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["User"], include_in_schema=True)


class ContentStats(BaseModel):
    """用户内容统计信息"""

    total_views: int = Field(0, description="总查看次数", example=1500)
    total_shares: int = Field(0, description="总分享次数", example=45)
    annotations_count: int = Field(0, description="用户有效注释数量", example=12)


class UserInfoResponse(BaseModel):
    uid: str = Field(description="用户UID", example="u123456789abc")
    email: Optional[str] = Field(
        None, description="用户邮箱", example="user@example.com"
    )
    name: Optional[str] = Field(None, description="用户姓名", example="Alice")
    picture: Optional[str] = Field(None, description="用户头像", example="https://...")
    provider: Optional[str] = Field(
        None, description="登录提供商", example="google.com"
    )
    content_stats: ContentStats = Field(
        default_factory=ContentStats, description="用户内容统计信息"  # 使用模型默认值
    )

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


class UpdateFCMTokenRequest(BaseModel):
    fcm_registration_token: str = Field(..., description="FCM 注册令牌")


def get_default_avatar(picture: Optional[str]) -> str:
    """
    Get user avatar with default fallback
    
    Args:
        picture: Original picture URL
        
    Returns:
        str: Picture URL with default fallback
    """
    return picture or "default_avatar.png"

def get_default_nickname(name: Optional[str], uid: str) -> str:
    """
    Get user nickname with default fallback
    
    Args:
        name: Original name
        uid: User ID to generate default name
        
    Returns:
        str: Name with default fallback
    """
    return name or uid[:10]

def enrich_user_profile(user_dict: dict) -> dict:
    """
    Enrich user profile with default avatar and nickname if not present
    
    Args:
        user_dict: User dictionary containing profile information
        
    Returns:
        dict: Enriched user dictionary with avatar and nickname
    """
    return {
        **user_dict,
        "picture": get_default_avatar(user_dict.get("picture")),
        "name": get_default_nickname(user_dict.get("name"), user_dict.get("uid", ""))
    }


@router.get(
    "/get",
    status_code=status.HTTP_200_OK,
    summary="User info",
    description="[SUCCESS], [FAILED]",
    response_model=CommonResponse[UserInfoResponse],
)
async def get_user():
    user = context_user.get()

    # 并行获取统计信息
    stats_data = await content_repository.get_user_content_stats()
    annotations_count = await annotation_repository.count_user_annotations()

    # 合并统计信息
    content_stats = ContentStats(**stats_data, annotations_count=annotations_count)

    # Set default values for picture and name if they are None
    response_data = {
        **user.__dict__,
        "uid": user.uid,
        "content_stats": content_stats,
    }
    response_data = enrich_user_profile(response_data)

    return success(UserInfoResponse.model_validate(response_data))


@router.post(
    "/update",
    status_code=status.HTTP_200_OK,
    summary="Update user profile",
    description="Update username and/or avatar (at least one field required)",
    response_model=CommonResponse[UserInfoResponse],
)
async def update_user_profile(update_data: UserUpdateRequest):
    user = context_user.get()

    # 验证至少有一个更新字段
    if not update_data.name and not update_data.picture:
        return failed("At least one field (name or picture) is required")

    # 构建更新参数
    update_params = {}
    if update_data.name is not None:
        update_params["name"] = update_data.name
    if update_data.picture is not None:
        update_params["picture"] = update_data.picture

    # 执行更新
    updated_user = await user_repository.update_account(
        user_id=user.id, **update_params
    )

    if not updated_user:
        return failed("Profile update failed")

    return await get_user()  # 返回更新后的完整用户信息


@router.post(
    "/upload_avatar",
    status_code=status.HTTP_200_OK,
    summary="Upload user avatar",
    description="Upload a new avatar image for the user",
    response_model=CommonResponse[str],
)
async def upload_avatar(file: UploadFile, background_tasks: BackgroundTasks):
    try:
        user = context_user.get()

        # 验证文件大小
        if not upload_file_size_is_valid(file, settings.agent_upload_max_size):
            return failed("File size is too large")

        # 验证文件类型为图片
        if not upload_file_type_is_valid(
            file, file_extensions=["image/jpeg", "image/png", "image/gif"]
        ):
            return failed("Only image files are allowed")

        # 生成唯一文件名
        timestamp = int(time.time())
        file_hash_prefix = hashlib.md5(f"{user.id}{timestamp}".encode()).hexdigest()[:8]
        new_file_name = f"avatar-{file_hash_prefix}-{file.filename}"
        uri = os.path.join(DEFAULT_UPLOAD_PATH, new_file_name)

        # Store file
        file_content = await file.read()
        await storage.save(uri, file_content)

        # 获取并返回文件URL
        avatar_url = storage.get_url(uri)
        return success(data=avatar_url)  # Directly return URL string

    except Exception as e:
        logger.exception(f"Error uploading avatar: {e}")
        return failed("Failed to upload avatar")


@router.post(
    "/update_fcm_token",
    status_code=status.HTTP_200_OK,
    summary="Update FCM registration token",
    description="Update the user's FCM registration token for push notifications",
    response_model=CommonResponse[bool],
)
async def update_fcm_token(request: UpdateFCMTokenRequest):
    user = context_user.get()
    if not user:
        return failed("User not found")

    # 更新 FCM 注册令牌
    updated_user = await user_repository.update_account(
        user_id=user.id,
        fcm_registration_token=request.fcm_registration_token
    )

    if not updated_user:
        return failed("Failed to update FCM token")

    return success(True)


