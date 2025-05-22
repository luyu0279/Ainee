import logging
from typing import Optional

from pydantic import BaseModel, Field
from starlette.requests import Request
from fastapi import APIRouter
from starlette import status

from app.common import CommonResponse, success
from app.context import context_user
from app.database.subscriptions import subscription_repository, SubscriptionStatus
from app.libs.google_sub_pub.utils import acknowledge_purchase, verify_purchase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subscription", tags=["Subscription"], include_in_schema=True)


class VerifyRequestModel(BaseModel):
    purchase_token: str = Field(description="The purchase token.", example="")
    package_name: str = Field(description="The package name.", example="ai.ainee.app")
    subscription_id: str = Field(description="The subscription id.", example="release_auto_monthly")
    source: Optional[str] = Field(description="The source of the subscription.", example="google_play")


@router.post(
    "/verify",
    status_code=status.HTTP_200_OK,
    summary="Verify purchase token",
    description="[SUCCESS], [FAILED]",
    response_model=CommonResponse[Optional[bool]]
)
async def verify(request: Request, verify_data: VerifyRequestModel):
    try:
        purchase_data = verify_purchase(purchase_token=verify_data.purchase_token,
                                        package_name=verify_data.package_name,
                                        the_subscription_id=verify_data.subscription_id)

        if purchase_data is None:
            return success(data=False)

        if bool(purchase_data.get('acknowledgementState')) is False:
            res = acknowledge_purchase(purchase_token=verify_data.purchase_token,
                                       package_name=verify_data.package_name,
                                       the_subscription_id=verify_data.subscription_id)
            logger.info(res)

            if res is not None:
                purchase_data = verify_purchase(purchase_token=verify_data.purchase_token,
                                                package_name=verify_data.package_name,
                                                the_subscription_id=verify_data.subscription_id)
            else:
                return success(data=False)

        await subscription_repository.add_subscription(
            user_id=context_user.get().id,
            subscription_id=verify_data.subscription_id,
            purchase_token=verify_data.purchase_token,
            status=SubscriptionStatus.ACTIVE,
            purchase_data=purchase_data,
        )

        return success(data=True)
    except Exception as e:
        logger.error(f"Error verifying purchase: {e}")
        return success(data=False)
