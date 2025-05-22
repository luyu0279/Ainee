from google.oauth2 import service_account
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# 你需要在 Google Cloud Console 中创建一个服务账号，并下载 JSON 密钥文件
# 替换为你的服务账号 JSON 密钥文件路径
json_path = '${json_path}'  

scopes = ['https://www.googleapis.com/auth/androidpublisher']

# Initialize credentials only once
credentials = service_account.Credentials.from_service_account_file(
    json_path,
    scopes=scopes
)

service = build('androidpublisher', 'v3', credentials=credentials)


def acknowledge_purchase(purchase_token, package_name, the_subscription_id):
    """确认购买"""
    # 需要使用你的开发者密钥和凭证进行认证
    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    try:
        return service.purchases().subscriptions().acknowledge(
            packageName=package_name,
            subscriptionId=the_subscription_id,
            token=purchase_token
        ).execute()
    except Exception as e:
        print(f"Error acknowledging purchase: {e}")
        return None


def verify_purchase(purchase_token, package_name, the_subscription_id):
    """验证购买并返回用户信息"""
    # 需要使用你的开发者密钥和凭证进行认证
    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    try:

        # {'startTimeMillis': '1731565010708', 'expiryTimeMillis': '1731567109141', 'autoRenewing': False,
        #  'priceCurrencyCode': 'SGD', 'priceAmountMicros': '1480000', 'countryCode': 'SG', 'developerPayload': '',
        #  'cancelReason': 1, 'orderId': 'GPA.3348-5678-2731-52445..5', 'purchaseType': 0, 'acknowledgementState': 1,
        #  'kind': 'androidpublisher#subscriptionPurchase',
        #  'obfuscatedExternalAccountId': 'VV83VTRGU2ljT0w0UGdtRzRqRHJkc3A='}
        return service.purchases().subscriptions().get(
            packageName=package_name,
            subscriptionId=the_subscription_id,
            token=purchase_token
        ).execute()

    except Exception as e:
        print(f"Error verifying purchase: {e}")
        return None


