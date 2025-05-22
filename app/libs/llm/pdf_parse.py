import io
import logging
import os
from typing import List, Dict, Optional

import aiohttp
import fitz
from PIL import Image
from pydantic import BaseModel
from app import settings
from app.libs.llm.llm_clients import llm_claude_token_count

logger = logging.getLogger(__name__)


def trim_to_token_limit(file_content: str, token_limit: Optional[int] = settings.pdf_process_token_limit) -> str:
    """
    截取字符串至 token 数量限制以内。

    :param file_content: 需要处理的字符串内容
    :param token_limit: 最大 token 数限制
    :return: 截取后的字符串或原始字符串
    """
    tokenizer = llm_claude_token_count.get_tokenizer()
    encoding = tokenizer.encode(file_content)
    tokens = encoding.ids  # Access the token IDs from the Encoding object
    token_count = len(tokens)

    # 如果 token 数超过限制，截取内容
    if token_count > token_limit:
        # 截取到 token 限制以内
        truncated_tokens = tokens[:token_limit]

        # 将截取后的 tokens 转回文本
        return tokenizer.decode(truncated_tokens)
    else:
        # 没有超过限制，直接返回原字符串
        return file_content


class PdfParseResult(BaseModel):
    total_pages: int
    processed_pages: int
    contents: str


class PdfImageResult:
    def __init__(self, total_pages: int, processed_pages: int, images: List[Dict]):
        self.total_pages = total_pages
        self.processed_pages = processed_pages
        self.images = images


async def pdf_to_images(file_content: bytes, output_folder: str, page_limit: int) -> Optional[PdfImageResult]:
    """
    将 PDF 文件按页转换为图片，调整更小边为 600，并保存到指定文件夹。

    :param file_content: 文件内容，字节流
    :param output_folder: 保存图片的目标文件夹
    :param page_limit: 每批次处理的页数限制
    :return: 包含总页数、已处理页数和生成的图片信息
    """
    try:
        # 确保输出文件夹存在
        os.makedirs(output_folder, exist_ok=True)

        # 打开 PDF 文件
        pdf_document = fitz.open(stream=file_content, filetype="pdf")
        total_pages = len(pdf_document)
        processed_pages = 0
        images = []
        min_edge_size = 800
        for page_number in range(total_pages):
            if page_number >= page_limit:
                break  # 限制处理的页数

            # 加载页面并渲染为图像
            page = pdf_document.load_page(page_number)
            pix = page.get_pixmap()
            image_filename = os.path.join(output_folder, f"page_{page_number + 1}.png")
            pix.save(image_filename)

            # 使用 Pillow 打开图像并调整大小
            with Image.open(image_filename) as img:
                # 获取原始尺寸
                width, height = img.size
                # 计算新的尺寸
                if width < height:
                    new_width = min_edge_size
                    new_height = int(height * (min_edge_size / width))
                else:
                    new_height = min_edge_size
                    new_width = int(width * (min_edge_size / height))
                # 调整图片大小
                img = img.resize((new_width, new_height), Image.LANCZOS)
                img.save(image_filename)  # 保存调整后的图片

            images.append({"page": page_number + 1, "path": image_filename})
            processed_pages += 1

        return PdfImageResult(
            total_pages=total_pages,
            processed_pages=processed_pages,
            images=images
        )

    except Exception as e:
        print(f"Error processing PDF to images: {e}")
        return None


async def process_pdf(file_content: bytes, filename: str, content_type: str, token_limit: int) \
        -> Optional[PdfParseResult]:
    """
    将 PDF 文件拆分成多个部分，每个部分通过服务进行处理，然后计算累积的 token 数量。

    :param file_content: 文件内容，字节流
    :param filename: 文件名
    :param content_type: 文件 MIME 类型
    :param token_limit: 每个拆分部分的 token 数量限制
    :return: 返回处理结果，包括 PDF 总页数、已处理页数、拆分后的内容
    """
    # await pdf_to_images(file_content, 'test', 100)

    try:
        target_url = 'http://10.255.8.188:8889/pdf_parse'
        # 读取 PDF 内容
        pdf_document = fitz.open(stream=file_content, filetype="pdf")
        total_pages = pdf_document.page_count

        split_contents = []
        current_page = 0
        total_token_count = 0  # 累积的 token 数量
        page_size = 5

        # 拆分 PDF 文件，直到累积的 token 数量超过限制
        while current_page < total_pages:
            # 每次最多读取 10 页
            end_page = min(current_page + page_size, total_pages)

            # 创建一个新的 PDF 文档来存储当前页面
            split_pdf = fitz.open()
            split_pdf.insert_pdf(pdf_document, from_page=current_page, to_page=end_page - 1)

            # 将拆分后的 PDF 保存到内存中
            split_file_content = io.BytesIO()
            split_pdf.save(split_file_content)
            split_file_content.seek(0)  # 将文件指针移动到开头

            # 使用服务处理拆分后的文件
            result = await process_pdf_with_service(split_file_content, filename, content_type, target_url)

            # 计算当前拆分部分的 token 数量
            token_count = llm_claude_token_count.count_tokens(result['data'].get('md_content'))
            total_token_count += token_count

            # 保存拆分后的文件
            split_contents.append(result['data'].get('md_content'))

            # 更新当前页
            current_page = end_page

            # 如果累积的 token 数量超过限制，停止拆分
            if total_token_count > token_limit:
                break

        # 返回 PDF 总页数，已处理页数以及拆分后的内容
        return PdfParseResult(
            total_pages=total_pages,
            processed_pages=current_page,
            contents="".join(split_contents)
        )

    except Exception as e:
        # 处理错误，记录日志或返回错误信息
        logger.exception(f"Error processing PDF: {e}")
        return None


async def process_pdf_with_service(file_content: io.BytesIO, filename: str, content_type: str,
                                   target_url: str) -> dict:
    """
    使用目标服务处理拆分后的 PDF 文件。

    :param file_content: 拆分后的 PDF 内容
    :param filename: 文件名
    :param content_type: 文件 MIME 类型
    :param target_url: 目标服务 URL
    :return: 返回处理结果
    """
    async with aiohttp.ClientSession() as session:
        form_data = aiohttp.FormData()
        form_data.add_field('pdf_file', file_content, filename=filename, content_type=content_type)
        form_data.add_field('parse_method', 'auto')
        form_data.add_field('model_json_path', '1')
        form_data.add_field('is_json_md_dump', 'true')
        form_data.add_field('output_dir', 'output')

        async with session.post(target_url, data=form_data) as response:
            result = {
                "status": response.status,
                "data": await response.json() if response.status == 200 else await response.text()
            }
            return result
