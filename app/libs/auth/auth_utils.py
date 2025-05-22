# auth.py
import jwt
from datetime import datetime, timedelta

from cryptography.fernet import Fernet
from nanoid import generate
import app
from app.config import settings

# 初始化加密密钥 (必须安全存储)
cipher = Fernet(settings.fernet_encryption_key)


def create_jwt_token_by_user_id(user_id: int):
    return create_jwt_token(data={"sub": user_id})


def create_jwt_token(*, data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()

    # 加密实体 ID，例如 "sub"
    if "sub" in to_encode:
        encrypted_id = cipher.encrypt(str(to_encode["sub"]).encode())
        to_encode["sub"] = encrypted_id.decode()  # 存储为字符串

    # 设置过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=15)  # 默认15天过期
    to_encode.update({"exp": expire})

    # 生成 JWT
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, settings.jwt_algorithm)
    return encoded_jwt


def decode_jwt_token(token):
    try:
        # 解码 JWT
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

        # 解密实体 ID
        if "sub" in payload:
            try:
                decrypted_id = cipher.decrypt(payload["sub"].encode()).decode()
                payload["sub"] = int(decrypted_id)  # 转回原始类型（例如整数）
            except Exception as e:
                return None

        return payload
    except jwt.ExpiredSignatureError:
        # return {"error": "Token 已过期"}
        return None
    except jwt.InvalidTokenError:
        # return {"error": "无效的 Token"}
        return None
    except Exception as e:
        # return {"error": f"发生错误: {str(e)}"}
        return None


def generate_uid():
    return f"U_{generate()}"
