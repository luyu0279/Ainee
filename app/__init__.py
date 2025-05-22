from .config import settings, StorageType
from app.api.health import router as health_router
from app.api.file.file import router as file_router
from app.api.user.auth import router as auth_router
from app.api.user.index import router as user_router
# from app.api.subscription.index import router as subscription_router
from app.api.content.index import router as content_router
from app.api.content.annotation import router as annotation_router
from app.api.knowledge_base.index import router as knowledge_base_router
from app.api.ainee_web.index import router as ainee_web_router
from app.api.rag_chat.index import router as rag_chat_router
