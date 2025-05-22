import logging
import time
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter
from firebase_admin import auth
from pydantic import BaseModel
from starlette import status
from app.context import context_user
from app.common import success, CommonResponse, failed
from app.database.users_dao import user_repository
from app.libs.auth.auth_utils import create_jwt_token_by_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["User"], include_in_schema=True)

# 创建一个线程池执行器
thread_pool = ThreadPoolExecutor()

class LoginRequest(BaseModel):
    id_token: str


class LoginResponse(BaseModel):
    jwt_token: str


def console_time(label):
    start_time = time.time()
    return start_time


# 模拟 console.timeEnd
def console_time_end(label, start_time):
    end_time = time.time()
    elapsed_time = end_time - start_time
    logger.info(f"{label}: {elapsed_time:.4f} seconds")


@router.post("/login",
             status_code=status.HTTP_200_OK,
             summary="User login",
             description="[SUCCESS], [FAILED]",
             response_model=CommonResponse[Optional[LoginResponse]]
             )
async def login(request: LoginRequest):
    try:
        start = console_time("login")
        
        # 将同步的 verify_id_token 操作包装在异步函数中
        loop = asyncio.get_running_loop()
        decoded_token = await loop.run_in_executor(
            thread_pool, 
            lambda: auth.verify_id_token(request.id_token, clock_skew_seconds=10)
        )
        
        console_time_end("login", start)

        other_start = console_time("other")
        # 提取信息
        email = decoded_token.get("email")
        provider = decoded_token.get("firebase", {}).get("sign_in_provider")
        provider_user_id = decoded_token.get("uid")  # 使用 uid 作为 provider_user_id
        email_verified = decoded_token.get("email_verified", False)
        picture = decoded_token.get("picture")  # 提取用户头像 URL
        phone_number = decoded_token.get("phone_number")  # 提取用户头像 URL
        firebase_aud = decoded_token.get("aud")
        name = decoded_token.get("name")

        account = await user_repository.get_account_by_provider_user_id(
            provider_user_id,
            provider
        )

        console_time_end("other", other_start)

        if account:
            updated_account = await user_repository.update_account(
                account.id,
                email=email,
                email_verified=email_verified,
                phone_number=phone_number,
                firebase_aud=firebase_aud,
            )

            if updated_account is not None:
                return success(LoginResponse(
                    jwt_token=create_jwt_token_by_user_id(
                        updated_account.id
                    )))

            return failed(message="User login failed")
        else:
            # 创建用户和第三方账户
            new_account = await user_repository.add_account(
                email=email,
                email_verified=email_verified,
                provider=provider,
                provider_user_id=provider_user_id,
                picture=picture,
                name=name,
            )

            if new_account:
                return success(LoginResponse(jwt_token=create_jwt_token_by_user_id(
                    new_account.id
                )))
            else:
                return failed(message="User creation failed")
    except Exception as e:
        logger.error(e)
        return failed(message="User creation failed, please try again.")


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User logout",
    description="Logout the current user and optionally clear FCM registration token",
    response_model=CommonResponse[bool],
)
async def logout():
    user = context_user.get()
    if not user:
        return failed("User not found")

    try:
        # 如果提供了 FCM 注册令牌，则清除它
        await user_repository.update_account(
            user_id=user.id,
            fcm_registration_token=None
        )

        # 这里可以添加其他登出逻辑，比如清除会话、记录日志等
        logger.info(f"User {user.id} logged out successfully")

        return success(True)
    except Exception as e:
        logger.error(f"Logout failed for user {user.id}: {str(e)}")
        return failed(message="Logout failed, please try again.")
