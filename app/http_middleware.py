import logging
import logging
import re

from fastapi import status, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

FORBIDDEN_RESPONSE = JSONResponse(
    status_code=status.HTTP_403_FORBIDDEN,
    content={"detail": "Forbidden"},
)


class CORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response

        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 记录请求信息
        if request.url.path != "/api/health":
            logger.info(f"Incoming request: {request.method} {request.url}")

        # 调用后续的处理逻辑
        response = await call_next(request)

        # 可选：记录响应信息
        # logger.info(f"Response status: {response.status_code}")

        return response
