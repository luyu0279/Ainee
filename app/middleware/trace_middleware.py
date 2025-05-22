import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from contextvars import ContextVar
import logging
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import Response
from fastapi import Request
import re

# 创建上下文变量
trace_id_ctx: ContextVar[str] = ContextVar("trace_id", default="")
ua_info_ctx: ContextVar[dict] = ContextVar("ua_info", default={})

logger = logging.getLogger(__name__)

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    合并的中间件，处理请求跟踪ID和UA信息，
    为每个请求添加唯一ID并解析UA信息，
    所有信息存储在上下文变量中，并在响应完成后清理。
    """
    async def dispatch(self, request: Request, call_next):
        # 1. 处理 trace ID
        trace_id = str(uuid.uuid4())
        trace_token = trace_id_ctx.set(trace_id)
        
        # 2. 处理 UA 信息
        ua = request.headers.get("user-agent", "")
        ua_info = self._parse_ua(ua)
        ua_token = ua_info_ctx.set(ua_info)
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 添加 trace ID 到响应头
            response.headers["X-Trace-ID"] = trace_id
            
            # 使用自定义send函数来延迟上下文清理
            original_send = response.__call__
            
            async def send_wrapper(scope, receive, send):
                try:
                    # 传递原始响应
                    await original_send(scope, receive, send)
                finally:
                    # 清理所有上下文，确保在响应完全发送后执行
                    trace_id_ctx.reset(trace_token)
                    ua_info_ctx.reset(ua_token)
            
            # 替换原始的__call__方法
            response.__call__ = send_wrapper
            
            return response
        except Exception as e:
            # 确保发生异常时也会重置上下文
            trace_id_ctx.reset(trace_token)
            ua_info_ctx.reset(ua_token)
            raise e
    
    def _parse_ua(self, ua: str) -> dict:
        """解析UA字符串为字典"""
        ua_info = {
            "device_id": None,
            "platform": None,
            "app_version": None,
            "app_build_number": None
        }
        
        # 使用正则表达式提取值
        device_id_match = re.search(r'A-Device-ID=([^;]+)', ua)
        platform_match = re.search(r'A-Platform=([^;]+)', ua)
        app_version_match = re.search(r'A-AppVersion=([^;]+)', ua)
        app_build_match = re.search(r'A-AppBuildNumber=([^;]+)', ua)
        
        if device_id_match:
            ua_info["device_id"] = device_id_match.group(1)
        if platform_match:
            ua_info["platform"] = platform_match.group(1)
        if app_version_match:
            ua_info["app_version"] = app_version_match.group(1)
        if app_build_match:
            ua_info["app_build_number"] = app_build_match.group(1)
            
        return ua_info


class TraceIDFilter(logging.Filter):
    """
    日志过滤器，将当前请求的trace ID添加到日志记录中
    """
    def __init__(self, name="", default_value="-"):
        super().__init__(name)
        self.default_value = default_value

    def filter(self, record):
        # 添加trace_id到日志记录
        record.trace_id = trace_id_ctx.get(self.default_value)
        return True


class UAInfoFilter(logging.Filter):
    """
    日志过滤器，将当前请求的UA信息添加到日志记录中
    """
    def __init__(self, name="", default_value="-"):
        super().__init__(name)
        self.default_value = default_value
        
    def filter(self, record):
        # 获取UA信息
        ua_info = ua_info_ctx.get()
        
        # 添加UA字段到记录
        record.device_id = ua_info.get("device_id", self.default_value)
        record.platform = ua_info.get("platform", self.default_value)
        record.app_version = ua_info.get("app_version", self.default_value)
        record.app_build = ua_info.get("app_build_number", self.default_value)
        
        return True


def get_current_trace_id() -> str:
    """
    获取当前请求的trace ID
    
    Returns:
        str: 当前trace ID或空字符串（如果不在请求上下文中）
    """
    return trace_id_ctx.get("") 