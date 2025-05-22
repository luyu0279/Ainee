import logging
from firebase_admin import messaging
from firebase_admin.exceptions import FirebaseError

logger = logging.getLogger(__name__)

class FCMService:
    @staticmethod
    async def send_notification_by_token(token: str, title: str, body: str, data: dict = None):
        """
        根据 FCM token 发送推送通知
        """
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                token=token,
                data=data
            )
            # response = messaging.send(message)
            # logger.info(f"Successfully sent FCM notification, message ID: {response}")
        except FirebaseError as e:
            logger.error(f"Failed to send FCM notification: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error while sending FCM notification: {str(e)}")
            raise
