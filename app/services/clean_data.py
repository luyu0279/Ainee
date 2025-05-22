import asyncio
import logging
from app.database.models.content import ContentMediaType, ProcessingStatus
from app.database.repositories.content_repository import content_repository

logger = logging.getLogger(__name__)

async def clean_pending_data():
    logger.info("Start cleaning pending data")
    records = await content_repository.get_stale_pending_contents()
    
    for record in records:
        try:
            if record.media_type == ContentMediaType.video:
                logger.info(f"Content {record.id} is a video, skipping...")
                continue
            
            # Update status to FAILED using repository method
            success = await content_repository.update_processing_status(record.id, ProcessingStatus.FAILED)
            if success:
                logger.info(f"Updated content {record.id} to FAILED status")
            else:
                logger.warning(f"Failed to update content {record.id}: No rows affected")
            
            # 控制写入速度，每处理一条记录后等待 0.1 秒
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Failed to update content {record.id}: {str(e)}")
            # 如果发生错误，等待更长时间再继续
            await asyncio.sleep(1)
    
    logger.info("Finished cleaning pending data")
