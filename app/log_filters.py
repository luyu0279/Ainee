from logging import Filter, LogRecord
from typing import Optional, Any

from app.context import context_device_id, context_user
from app.middleware.trace_middleware import ua_info_ctx


def _trim_string(string: Optional[str], string_length: Optional[int]) -> Optional[str]:
    return string[:string_length] if string_length is not None and string else string


class DeviceIdFilter(Filter):
    def __init__(
            self,
            name: str = "device_id",
            default_value: Optional[str] = "-",
    ):
        super().__init__(name=name)
        self.default_value = default_value

    def filter(self, record: LogRecord) -> bool:
        record.device_id = context_device_id.get(self.default_value)
        return True


class UIDFilter(Filter):
    def __init__(
            self,
            name: str = "uid",
            default_value: Optional[str] = "-",
    ):
        super().__init__(name=name)
        self.default_value = default_value

    def filter(self, record: LogRecord) -> bool:
        user = context_user.get()
        uid = user.uid if user else self.default_value
        record.uid = uid
        return True

class UAInfoFilter(Filter):
    def __init__(self, name: str = "", default_value: str = "-") -> None:
        super().__init__(name)
        self.default_value = default_value

    def filter(self, record: LogRecord) -> bool:
        # Get UA info from context
        ua_info = ua_info_ctx.get()
        
        # Add UA fields to record
        record.device_id = ua_info.get("device_id", self.default_value)
        record.platform = ua_info.get("platform", self.default_value)
        record.app_version = ua_info.get("app_version", self.default_value)
        record.app_build = ua_info.get("app_build_number", self.default_value)
        
        return True 