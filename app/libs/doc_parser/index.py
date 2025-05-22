from markitdown import DocumentConverterResult, MarkItDown
import aiofiles  # 用于异步文件操作
import asyncio

class DocParser:
    def __init__(self):
        self.md = MarkItDown(enable_plugins=True)  # 初始化 MarkItDown 实例

    async def parse(self, file_path) -> DocumentConverterResult:
        # 将同步的 convert 操作放到线程池中执行，避免阻塞事件循环
        result = await asyncio.to_thread(self.md.convert, file_path)
        return result 

        