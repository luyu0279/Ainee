import asyncio
import logging

from celery import Celery
from app import settings
from app.database.models.content import RAGProcessingStatus
from app.database.repositories.content_repository import content_repository
from app.libs.rag.rag_utils import rag_utils

logger = logging.getLogger(__name__)
celery_app = Celery(
    "rag-tasks", broker=settings.celery_broker_url, backend=settings.celery_result_backend
)

# 添加配置
celery_app.conf.broker_connection_retry_on_startup = True

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    queue='rag_queue'
)
def rag_process(self, content_id: int):
    # logger.info(f"Task {self.request.id} is generating...")

    # 使用 asyncio 运行异步代码
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # 如果事件循环已运行，创建新任务
        loop.create_task(_handle_task(content_id))
    else:
        # 否则运行完整事件循环
        loop.run_until_complete(_handle_task(content_id))

async def _handle_task(content_id: int):
    logger.info(f"Processing RAG, content id is: {content_id}")
    try:
        content = await content_repository.get_by_id(content_id)
        if not content:
            logger.error(f"Content not found, id: {content_id}")
            return
        if content.rag_status != RAGProcessingStatus.waiting_init:
            logger.info(f"Content already processed, id: {content_id}")
            return
       
        dataset_id, doc_id, started = await rag_utils.process_and_upload_file(content)

        # if not dataset_id or not content.dataset_id:
        #     logger.error(f"Content dataset_id or dataset_doc_id is None, id: {content_id}")
        #     return

        if dataset_id and doc_id and started:
            logger.info(f"RAG process started, dataset_id: {dataset_id}, doc_id: {doc_id}")
            await content_repository.update(
                content_id,
                dataset_id=dataset_id,
                dataset_doc_id=doc_id,
                rag_status=RAGProcessingStatus.processing,
            )
        
            succeed, message = await rag_utils.wait_for_document_processing(dataset_id, doc_id)
            logger.info(f"RAG process result, succeed: {succeed}, message: {message}")
            await content_repository.update(
                content_id,
                rag_status=RAGProcessingStatus.completed if succeed else RAGProcessingStatus.failed,
            )
        else:
            raise Exception("RAG process failed, dataset_id or doc_id is None")
    except Exception as e:
        raise e