import logging
from app.config import settings
from app.libs.rag.ragflow_sdk.ragflow import RAGFlow
logger = logging.getLogger(__name__)
logger.info("Initializing RAGFlow SDK with API key and base URL")
# Initialize the RAGFlow object with API key and base URL
rag_object = RAGFlow(api_key=settings.ragflow_key, base_url=settings.ragflow_base)