import asyncio
import base64
import json
import logging
from enum import IntEnum
from functools import partial

from google.oauth2 import service_account
from googleapiclient.discovery import build
import google.auth
from google.cloud import pubsub_v1
from concurrent.futures import ThreadPoolExecutor
from app.database.subscription_history import subscription_history_repository
from app.database.subscriptions import subscription_repository, SubscriptionStatus
from app.database.users_dao import user_repository
from app.libs.google_sub_pub.utils import verify_purchase

logger = logging.getLogger(__name__)

project_id = "ainee-f6194"
subscription_id = "ainne_play_notifications-sub"
# Number of seconds the subscriber should listen for messages
timeout = 5.0
subscriber = pubsub_v1.SubscriberClient()
# The `subscription_path` method creates a fully qualified identifier
# in the form `projects/{project_id}/subscriptions/{subscription_id}`
subscription_path = subscriber.subscription_path(project_id, subscription_id)


# notificationType:
# 订阅的 notificationType 可以具有以下值：
# (1) SUBSCRIPTION_RECOVERED - 从账号保留状态恢复了订阅。
# (2) SUBSCRIPTION_RENEWED - 续订了处于活动状态的订阅。
# (3) SUBSCRIPTION_CANCELED - SUBSCRIPTION_IN_GRACE_PERIOD自愿或非自愿地取消了订阅。如果是自愿取消，在用户取消时发送。
# (4) SUBSCRIPTION_PURCHASED - 购买了新的订阅。
# (5) SUBSCRIPTION_ON_HOLD - 订阅已进入账号保留状态（如果已启用）。
# (6) SUBSCRIPTION_IN_GRACE_PERIOD - 订阅已进入宽限期（如果已启用）。
# (7) SUBSCRIPTION_RESTARTED - 用户已通过 Play > 账号 > 订阅恢复了订阅。订阅已取消，但在用户恢复时尚未到期。如需了解详情，请参阅恢复。
# (8) SUBSCRIPTION_PRICE_CHANGE_CONFIRMED - 用户已成功确认订阅价格变动。
# (9) SUBSCRIPTION_DEFERRED - 订阅的续订时间点已延期。
# (10) SUBSCRIPTION_PAUSED - 订阅已暂停。
# (11) SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED - 订阅暂停计划已更改。
# (12) SUBSCRIPTION_REVOKED - 用户在到期时间之前已撤消订阅。
# (13) SUBSCRIPTION_EXPIRED - 订阅已到期。
# (20) SUBSCRIPTION_PENDING_PURCHASE_CANCELED - 待处理的交易 项订阅已取消。


class SubscriptionNotificationType(IntEnum):
    SUBSCRIPTION_RECOVERED = 1
    SUBSCRIPTION_RENEWED = 2
    SUBSCRIPTION_CANCELED = 3
    SUBSCRIPTION_PURCHASED = 4
    SUBSCRIPTION_ON_HOLD = 5
    SUBSCRIPTION_IN_GRACE_PERIOD = 6
    SUBSCRIPTION_RESTARTED = 7
    SUBSCRIPTION_PRICE_CHANGE_CONFIRMED = 8
    SUBSCRIPTION_DEFERRED = 9
    SUBSCRIPTION_PAUSED = 10
    SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED = 11
    SUBSCRIPTION_REVOKED = 12
    SUBSCRIPTION_EXPIRED = 13
    SUBSCRIPTION_PENDING_PURCHASE_CANCELED = 20

    @property
    def db_name(self) -> str:
        """返回用于数据库存储的名称"""
        return self.name


# 定义状态更新映射
STATUS_UPDATES = {
    SubscriptionNotificationType.SUBSCRIPTION_RECOVERED: SubscriptionStatus.ACTIVE,
    SubscriptionNotificationType.SUBSCRIPTION_RENEWED: SubscriptionStatus.ACTIVE,
    SubscriptionNotificationType.SUBSCRIPTION_RESTARTED: SubscriptionStatus.ACTIVE,
    SubscriptionNotificationType.SUBSCRIPTION_ON_HOLD: SubscriptionStatus.ON_HOLD,
    SubscriptionNotificationType.SUBSCRIPTION_IN_GRACE_PERIOD: SubscriptionStatus.IN_GRACE_PERIOD,
    SubscriptionNotificationType.SUBSCRIPTION_PAUSED: SubscriptionStatus.PAUSED,
    SubscriptionNotificationType.SUBSCRIPTION_EXPIRED: SubscriptionStatus.CANCELED,
}


async def handle_subscription_event(notification_type: int,
                                    the_subscription_id: str,
                                    purchase_token: str,
                                    purchase,
                                    event_raw: dict) -> None:
    """处理不同的 subscription notificationType."""
    try:
        # 转换为枚举类型
        try:
            event_type = SubscriptionNotificationType(notification_type)
        except ValueError:
            logger.info(f"Unknown notification type: {notification_type}")
            return

        if not purchase:
            logger.error(f"Failed to verify purchase for token: {purchase_token}")
            return

        # 解析用户ID
        try:
            uid = base64.b64decode(purchase.get('obfuscatedExternalAccountId')).decode('utf-8')
            if not uid:
                raise ValueError("Empty uid after decoding")
        except Exception as e:
            logger.error(f"Failed to decode uid from purchase: {purchase}, error: {e}")
            return

        # 获取用户信息
        user = await user_repository.get_account_by_uid(uid)
        if not user:
            logger.error(f"User not found for uid: {uid}")
            return

        # 记录订阅历史 - 使用事件类型名称而不是数值
        await add_or_update_subscription_history(user.id, the_subscription_id, f"{event_type.db_name}_{event_type}",
                                                 event_raw)

        # 处理特殊的取消/撤销情况
        if event_type in [
            SubscriptionNotificationType.SUBSCRIPTION_CANCELED,
            SubscriptionNotificationType.SUBSCRIPTION_REVOKED
        ]:
            reason = "User canceled" if event_type == SubscriptionNotificationType.SUBSCRIPTION_CANCELED \
                else "Subscription revoked"
            await subscription_repository.cancel_subscription(purchase_token, cancel_reason=reason,
                                                              cancel_survey_reason=purchase.get("cancelReason") or None)
            logger.info(f"{event_type.name} (subscriptionId: {the_subscription_id})")
            return

        # 处理新购买情况
        if event_type == SubscriptionNotificationType.SUBSCRIPTION_PURCHASED:
            await subscription_repository.add_subscription(
                user_id=user.id,
                subscription_id=the_subscription_id,
                purchase_token=purchase_token,
                status=SubscriptionStatus.ACTIVE,
                purchase_data=purchase
            )
            logger.info(f"Subscription purchased (subscriptionId: {the_subscription_id})")
            return

        # 处理状态更新
        if event_type in STATUS_UPDATES:
            new_status = STATUS_UPDATES[event_type]
            await subscription_repository.update_subscription_status(purchase_token, new_status)
            logger.info(
                f"{event_type.name} - Status updated to {new_status.value} (subscriptionId: {the_subscription_id})")
        else:
            # 处理不需要状态更新的通知类型
            logger.info(f"{event_type.name} - No status update needed (subscriptionId: {the_subscription_id})")

    except Exception as e:
        logger.error(f"Error handling subscription event: {e}")


async def add_or_update_subscription_history(user_id: int, the_subscription_id: str, event_type: str,
                                             event_raw: dict) -> None:
    """Add or update subscription history based on the event type."""
    await subscription_history_repository.add_subscription_history(
        user_id=user_id,
        subscription_id=the_subscription_id,
        event_type=event_type,
        event_data=event_raw
    )


def sync_callback(message, loop):
    """同步回调函数，用于处理 Pub/Sub 消息"""
    try:
        # 解析消息数据
        event = json.loads(message.data)
        subscription_notification_data = event.get('subscriptionNotification')
        logger.info(f"Received message ================")
        if subscription_notification_data:
            notification_type = subscription_notification_data.get('notificationType')
            logger.info(f"Received subscription notification: {notification_type}, event name is "
                        f"{SubscriptionNotificationType(notification_type).db_name}")
            the_subscription_id = subscription_notification_data.get('subscriptionId')
            purchase_token = subscription_notification_data.get('purchaseToken')
            logger.info(f"Subscription ID: {the_subscription_id}, Purchase Token: {purchase_token}")
            package_name = event.get("packageName")

            if the_subscription_id and purchase_token:
                # 在线程池中执行同步的验证操作
                purchase = verify_purchase(purchase_token, package_name, the_subscription_id)
                if purchase is not None:
                    # 创建异步任务并等待完成
                    async def process_message():
                        try:
                            await handle_subscription_event(
                                notification_type,
                                the_subscription_id,
                                purchase_token,
                                purchase,
                                event
                            )
                        except Exception as e:
                            logger.error(f"Error handling subscription event: {e}")

                    # 使用 run_coroutine_threadsafe 在主事件循环中运行协程
                    future = asyncio.run_coroutine_threadsafe(process_message(), loop)
                    try:
                        # 等待任务完成，设置超时时间
                        future.result(timeout=30)
                    except TimeoutError:
                        logger.error("Message processing timed out")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
            else:
                logger.error("Missing subscription_id or purchase_token")
    except Exception as e:
        logger.error(f"Error in sync_callback: {e}")
    finally:
        # 确保消息一定会被确认
        message.ack()
        logger.info("Message processed and acknowledged")


async def start_subscriber(loop):
    """异步函数来启动订阅"""
    global main_loop
    main_loop = loop

    try:
        # 创建带有循环引用的回调
        callback_with_loop = partial(sync_callback, loop=loop)

        # 在线程池中运行订阅操作
        with ThreadPoolExecutor() as executor:
            future = executor.submit(
                subscriber.subscribe,
                subscription_path,
                callback=callback_with_loop
            )
            # 等待订阅完成
            await asyncio.get_event_loop().run_in_executor(
                None,
                future.result
            )
    except Exception as e:
        logger.error(f"Error starting subscriber: {e}")
