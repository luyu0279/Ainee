import logging
from app.database.models.content import Content, ContentMediaType, ProcessingStatus
from app.database.repositories.content_repository import content_repository
from app.services.fcm_service import FCMService
from app.database.users_dao import user_repository
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

class NotificationAction(Enum):
    VIEW_DETAIL = "view_detail"    # 查看详情
    VIEW_IN_INBOX = "view_inbox"   # 在收件箱中查看

class NotificationService:
    def __init__(self):
        self.fcm_service = FCMService

    async def notify_user(self, user_id: int, title: str, body: str, data: dict = None):
        """
        向指定用户发送推送通知
        """
        user = await user_repository.get_account_by_id(user_id)
        if not user or not user.fcm_registration_token:
            logger.warning(f"User {user_id} has no FCM registration token")
            return

        await self.fcm_service.send_notification_by_token(
            user.fcm_registration_token, 
            title, 
            body, 
            data
        )

 
    async def notify_content_status(self, content_id: int):
        """
        通知用户内容处理状态
        只处理成功和失败两种状态的通知
        """
        content = await content_repository.get_by_id(content_id)
        if not content:
            logger.warning(f"Content not found: {content_id}")
            return
            
        # 只处理成功和失败状态
        if content.processing_status not in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
            return

        # 获取通知内容
        title, body, action = self._get_notification_content(content)
        
        # 构建数据
        data = {
            'content_id': content.uid,
            'status': content.processing_status,
            'type': content.media_type,
            'action': action.value,
            'title': content.title  # 用于在收件箱中定位
        }
        
        await self.notify_user(content.user_id, title, body, data)

    def _get_notification_content(self, content: Content) -> tuple[str, str, NotificationAction]:
        """
        根据内容状态生成通知文案和动作
        只处理成功和失败两种状态
        返回: (标题, 内容, 动作)
        """
        # 获取文件名，如果标题太长则截断
        file_name = content.title
        if len(file_name) > 20:
            file_name = file_name[:17] + "..."

        # 根据媒体类型获取文件类型描述
        type_desc = {
            ContentMediaType.pdf: "PDF file",
            ContentMediaType.audio: "Audio file",
            ContentMediaType.audio_microphone: "Audio file",
            ContentMediaType.audio_internal: "Audio file",
            ContentMediaType.video: "Video file",
            ContentMediaType.article: "Article",
        }.get(content.media_type, "File")

        # 只处理成功和失败两种状态
        if content.processing_status == ProcessingStatus.COMPLETED:
            return (
                "Processing Complete",
                f'{type_desc}:「{file_name}」 has been successfully processed! Tap to view the results.',
                NotificationAction.VIEW_DETAIL
            )
        else:  # ProcessingStatus.FAILED
            return (
                "Processing Failed",
                f'Encountered an issue processing {type_desc}:「{file_name}」. Tap to view and try again.',
                NotificationAction.VIEW_IN_INBOX
            )

   