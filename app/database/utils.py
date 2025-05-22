from functools import wraps

from app.context import context_user


def require_user(default_return=None):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = context_user.get()
            if not user:
                return default_return
            return await func(*args, **kwargs)

        return wrapper

    return decorator
