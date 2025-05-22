from typing import List

from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.context import context_user, context_device_id
from app.database.users_dao import user_repository
from app.libs.auth.auth_utils import decode_jwt_token

jwt_protected_paths: List[str] = [
    "/api/",
]

ignore_patterns: List[str] = [
    "/redoc",
    "/openapi.json",
    "/api/health",
    "/storage/uploads",
    "/api/user/get_xxx",
    "/api/user/login",
    "/static",
    "/api/content/uid/",
    "/api/annotation/content",
    "/api/content/view",
    "/api/kb/get_detail",
    "/api/kb/list/explore",
    "/api/kb/get_contents",
    "/api/kb/get_list_by_user",
    "/api/ainee_web",
    "/api/metabase/webhook"
]


class FlexibleAuthMiddleware:
    """
    验证中间件，验证 device id 和 token
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):

        if scope["type"] == "http":
            request = Request(scope, receive=receive, send=send)
            path = request.url.path

            # 如果是 OPTIONS 请求，或者 path 是 /redoc /openapi.json 直接通过
            if request.method == "OPTIONS":
                await self.app(scope, receive, send)
                return

            token = request.headers.get("Authorization")

            # 忽略路径的逻辑
            if not token:
                if any(path.startswith(pattern) for pattern in ignore_patterns):
                    await self.app(scope, receive, send)
                    return

            did = request.headers.get("A-Device-ID", None)
          
            if did:
                context_device_id.set(did)

            if any(path.startswith(p) for p in jwt_protected_paths):
              
                if not token:
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Not authenticated"},
                    )
                    self._add_cors_headers(response)
                    await response(scope, receive, send)
                    return

                scheme, _, token = token.partition(" ")
                if scheme.lower() != "bearer":
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid authentication scheme"},
                    )
                    self._add_cors_headers(response)
                    await response(scope, receive, send)
                    return

                payload = decode_jwt_token(token)
                if payload is None:
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid token or token expired"},
                    )
                    self._add_cors_headers(response)
                    await response(scope, receive, send)
                    return

                user = await user_repository.get_account_by_id(payload["sub"])
                if not user:
                    response = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={"detail": "User not found"},
                    )
                    self._add_cors_headers(response)
                    await response(scope, receive, send)
                    return

                # 设置用户ID
                context_user.set(user)

                # active_subscriptions = await subscription_repository.get_active_subscriptions_by_user(
                #     context_user.get().id)
                # context_premium_active.set(len(active_subscriptions) > 0)

        await self.app(scope, receive, send)

    @staticmethod
    def _add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"  # 替换成你的前端地址
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
