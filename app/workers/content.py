import asyncio
import logging
import os
import subprocess
import time
from celery import Celery
from app import settings
from app.common import format_subtitles, is_audio_type
from app.database.models.content import ContentMediaType
from app.database.repositories.content_repository import content_repository
from app.libs.llm.content import (
    get_content_summary,
    get_markdownmap,
    get_recommend_reason,
    get_tags,
)
from app.services.fcm_service import FCMService
from app.services.notification_service import NotificationService


logger = logging.getLogger(__name__)
celery_app = Celery(
    "tasks", broker=settings.celery_broker_url, backend=settings.celery_result_backend
)

# 添加配置
celery_app.conf.broker_connection_retry_on_startup = True


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    queue='content_queue'
)
def content_ai_process(self, content_id: int):
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
    logger.info(f"Processing content AI, content id is: {content_id}")
    try:
        content = await content_repository.get_by_id(content_id)
        if not content:
            logger.error(f"Content not found, id: {content_id}")
            return

        # Format video subtitles if present
        if content.media_type == ContentMediaType.video and content.media_subtitles:
            if not content.media_subtitles:
                summary_process_content = None
            else:
                summary_process_content = format_subtitles(content.media_subtitles)
        elif is_audio_type(content.media_type) and content.media_subtitles:
            if not content.media_subtitles:
                summary_process_content = None
            else:
                summary_process_content = format_subtitles(content.media_subtitles)
        else:
            summary_process_content = content.text_content

        if not summary_process_content:
            return

        await _process_summary(content_id, summary_process_content)

        tasks = [
            _process_structure(content_id, summary_process_content),
            _process_recommend_reason(content_id, summary_process_content),
            _process_tags(content_id, summary_process_content),
        ]
        await asyncio.gather(*tasks)
    except Exception as e:
        logger.error(f"Unexpected error processing content {content_id}: {str(e)}")
        raise
    finally:
        await NotificationService().notify_content_status(content_id)
        logger.info(f"Finished processing content AI, content id is: {content_id}")


async def _process_summary(content_id: int, content: str):
    try:
        logger.info(f"Processing summary for content {content_id}")
        start_time = time.time()
        summary_res = await get_content_summary(content)
        elapsed_time = time.time() - start_time
        logger.info(
            f"Summary processing completed in {elapsed_time:.2f} seconds for content {content_id}"
        )
        await content_repository.update(
            content_id=content_id,
            ai_summary=summary_res,
        )
    except Exception as e:
        logger.error(f"Failed to process summary for content {content_id}: {str(e)}")


async def _process_structure(content_id: int, content: str):
    try:
        logger.info(f"Processing mermaid for content {content_id}")
        structure_res = await get_markdownmap(content)

        await content_repository.update(
            content_id=content_id,
            ai_structure=structure_res,
        )
    except Exception as e:
        logger.error(f"Failed to process mermaid for content {content_id}: {str(e)}")


async def _process_recommend_reason(content_id: int, content: str):
    try:
        logger.info(f"Processing recommendation reason for content {content_id}")
        recommend_reason_res = await get_recommend_reason(content)
        await content_repository.update(
            content_id=content_id,
            ai_recommend_reason=recommend_reason_res,
        )
    except Exception as e:
        logger.error(
            f"Failed to process recommendation reason for content {content_id}: {str(e)}"
        )


async def _process_tags(content_id: int, content: str):
    try:
        logger.info(f"Processing tags for content {content_id}")
        tags = await get_tags(content)
        await content_repository.update(
            content_id=content_id,
            ai_tags=tags,
        )
    except Exception as e:
        logger.error(f"Failed to process tags for content {content_id}: {str(e)}")
