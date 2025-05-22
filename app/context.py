from contextvars import ContextVar
from typing import Optional

import logging

from app.database.users_dao import UserModel

logger = logging.getLogger(__name__)

# Middleware
context_user: ContextVar[Optional[UserModel]] = ContextVar("context_user", default=None)
# Middleware
context_device_id: ContextVar[Optional[str]] = ContextVar("device_id", default=None)
context_premium_active: ContextVar[Optional[bool]] = ContextVar("premium_active", default=False)

# redis_client = redis.from_url(settings.redis_url)


# def redis_cache(ttl=60, cache_key_index=None):
#     def decorator(func):
#         @wraps(func)
#         def wrapper(*args, **kwargs):
#             # try to get data from Redis
#             key = func.__name__
#             if cache_key_index:
#                 param = str(args[cache_key_index]).replace(" ", "%20")
#                 key = f"{key}:{param}"
#
#             data = redis_client.get(key)
#             if data:
#                 logger.info(f"Hit redis cache, key: {key}")
#                 return_type = func.__annotations__.get("return")
#                 if return_type and hasattr(return_type, "parse_raw"):
#                     return return_type.parse_raw(data)
#                 else:
#                     return json.loads(data)
#
#             logger.info(f"Miss redis cache, key: {key}")
#             # call the original function
#             result = func(*args, **kwargs)
#
#             # cache the result in Redis
#             if isinstance(result, BaseModel):
#                 redis_client.setex(key, time=ttl, value=result.model_dump_json())
#             else:
#                 redis_client.setex(key, time=ttl, value=json.dumps(result))
#
#             return result
#
#         return wrapper
#
#     return decorator
