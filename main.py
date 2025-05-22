import logging.config
import asyncio
import uuid
from typing import List, Dict

from fastapi import FastAPI, Header, BackgroundTasks
from fastapi.staticfiles import StaticFiles

from app.auth_middleware import FlexibleAuthMiddleware
from app.libs.firebase.index import init_firebase_credential
from app.database.models.content import Content, RAGProcessingStatus
from app.database.repositories.content_repository import content_repository
from app.libs.rag.rag_utils import rag_utils

from app.http_middleware import CORSMiddleware, RequestLoggingMiddleware
from app import (
    settings,
    StorageType,
    health_router,
    auth_router,
    user_router,
    # subscription_router,
    content_router,
    annotation_router,
    knowledge_base_router,
    ainee_web_router,
    rag_chat_router,
)
from app.services.clean_data import clean_pending_data
from apscheduler.schedulers.asyncio import AsyncIOScheduler
# 合并了TraceMidlleware和UAMiddleware为一个RequestContextMiddleware
from app.middleware.trace_middleware import RequestContextMiddleware, TraceIDFilter, UAInfoFilter

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "[%(asctime)s] [%(levelname)-8s] [%(name)-20s:%(lineno)-4d] [trace:%(trace_id)s] uid:[%(uid)s] device_id:[%(device_id)s] platform:[%(platform)s] app_version:[%(app_version)s] build:[%(app_build)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "access": {
            "format": "[%(asctime)s] [%(levelname)-8s] [%(name)-20s:%(lineno)-4d] [trace:%(trace_id)s] uid:[%(uid)s] device_id:[%(device_id)s] platform:[%(platform)s] app_version:[%(app_version)s] build:[%(app_build)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "DEBUG",
            "formatter": "default",
            "filters": ["device_id", "uid", "ua_info", "trace_id"],
        },
        "access": {
            "class": "logging.StreamHandler",
            "level": "INFO", 
            "formatter": "access",
            "filters": ["device_id", "uid", "ua_info", "trace_id"],
        },
    },
    "loggers": {
        "uvicorn": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "app": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "filters": {
        "device_id": {"()": "app.log_filters.DeviceIdFilter", "default_value": "-"},
        "uid": {"()": "app.log_filters.UIDFilter", "default_value": "-"},
        "ua_info": {"()": "app.middleware.trace_middleware.UAInfoFilter", "default_value": "-"},
        "trace_id": {"()": "app.middleware.trace_middleware.TraceIDFilter", "default_value": "-"},
    },
}
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

init_firebase_credential()

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    servers=[
        {
            "url": settings.server_url,
        }
    ],
    docs_url=None if settings.in_production else "/docs",
    redoc_url=None if settings.in_production else "/redoc",
    openapi_url=None if settings.in_production else "/openapi.json",
)


async def verify_headers(
    a_deviceid: str = Header(..., alias="A-Device-ID"),
    authorization: str = Header(..., alias="Authorization"),
):
    return {"A-Device-ID": a_deviceid, "Authorization": authorization}


app.openapi_version = "3.0.2"

# Mount the static files.
if settings.storage_type == StorageType.LOCAL:
    logger.info("Mounting local storage, path: {}".format(settings.local_storage_path))
    app.mount(
        settings.local_storage_url_prefix,
        StaticFiles(directory=settings.local_storage_path),
        name="storage",
    )

# 添加中间件，从外到内处理请求（从内到外处理响应）
# 确保RequestContextMiddleware首先处理请求，以便所有其他中间件都可以使用上下文信息
app.add_middleware(CORSMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(FlexibleAuthMiddleware)
app.add_middleware(RequestContextMiddleware) 

# API Routes
app.include_router(health_router)
routers = [
    auth_router,
    user_router,
    # subscription_router,
    content_router,
    annotation_router,
    knowledge_base_router,
    ainee_web_router,
    rag_chat_router,
]

for router in routers:
    app.include_router(router)

# 将静态文件目录挂载到 / 路径
app.mount("/static", StaticFiles(directory="data/static", html=False), name="static")


# FastAPI 启动时的事件处理
@app.on_event("startup")
async def startup():
    logger.info("Application started with request tracing enabled")


@app.on_event("shutdown")
async def shutdown():
    pass

if __name__ == "__main__":
    """Run the app in development mode."""
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_config=LOGGING_CONFIG
    )
