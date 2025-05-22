import os
import json
import logging
import tempfile
import aiohttp
from typing import Optional, Tuple
import asyncio
import time
from app.config import settings
from app.libs.rag.ragflow_sdk.ragflow  import DataSet, RAGFlow
from app.database.models.content import Content, ContentMediaType
from app.api.file.file import storage
import re

from app.libs.rag.rag_object import rag_object

logger = logging.getLogger(__name__)


class RAGUtils:
    rag_object: RAGFlow

    def __init__(self, rag_object: RAGFlow):
        self.rag_object = rag_object

    def _clean_filename(self, filename: str) -> str:
        """Clean filename by removing special characters and ensuring proper encoding

        Args:
            filename: Original filename

        Returns:
            Cleaned filename
        """
        # Remove special characters
        # Keep only alphanumeric, Chinese characters, spaces, and basic punctuation
        cleaned = re.sub(r"[^\w\s\u4e00-\u9fff\-\.]", "", filename)
        # Replace multiple spaces with single space
        cleaned = re.sub(r"\s+", " ", cleaned)
        # Remove leading/trailing spaces
        cleaned = cleaned.strip()
        # Ensure we have a valid filename
        if not cleaned:
            cleaned = "untitled"
        return cleaned

    def _truncate_title(self, title: str, max_bytes: int = 120) -> str:
        """Truncate title to ensure filename is within byte limit

        Args:
            title: Original title
            max_bytes: Maximum bytes allowed (default 120 to leave room for .txt)

        Returns:
            Truncated title
        """
        # Clean the title first
        title = self._clean_filename(title)

        encoded = title.encode("utf-8")
        if len(encoded) <= max_bytes:
            return title

        # Binary search to find the right length
        left, right = 0, len(title)
        while left < right:
            mid = (left + right + 1) // 2
            if len(title[:mid].encode("utf-8")) <= max_bytes:
                left = mid
            else:
                right = mid - 1

        return title[:left]

    def _format_subtitles(self, subtitles_json) -> str:
        """Format subtitles from JSON to timestamp-text format

        Args:
            subtitles_json: List of subtitle objects with text, start, and duration

        Returns:
            str: Formatted subtitles in mm:ss-mm:ss text format
        """
        if not subtitles_json:
            return ""

        formatted_lines = []
        for subtitle in subtitles_json:
            start_time = int(subtitle["start"])
            end_time = start_time + int(subtitle["duration"])

            start_mm = str(start_time // 60).zfill(2)
            start_ss = str(start_time % 60).zfill(2)
            end_mm = str(end_time // 60).zfill(2)
            end_ss = str(end_time % 60).zfill(2)

            formatted_line = (
                f"{start_mm}:{start_ss}-{end_mm}:{end_ss} {subtitle['text']}"
            )
            formatted_lines.append(formatted_line)

        return "\n".join(formatted_lines)

    async def _get_content_and_file_info(self, article: Content) -> Tuple[str, str, bool]:
        """
        Get content and file information based on media type.
        Returns: (content, file_extension)
        """
        if article.media_type == ContentMediaType.article:
            return article.content, ".txt", True
        elif article.media_type in [
            ContentMediaType.audio,
            ContentMediaType.audio_internal,
            ContentMediaType.audio_microphone,
            ContentMediaType.video,
            ContentMediaType.spotify_audio,
        ]:
            return self._format_subtitles(article.media_subtitles) or "", ".txt", True
        elif article.media_type in [
            ContentMediaType.article,
        ]:
            return article.content, ".txt", True
        elif article.media_type == ContentMediaType.image:
            if article.image_ocr:
                return article.image_ocr, ".txt", True
            else:
                return article.content, ".txt", True
        else:
            # For other types, get the file from storage
            file_url = storage.get_url(article.file_name_in_storage)
            file_extension = os.path.splitext(article.file_name_in_storage)[1]
            return file_url, file_extension, False

    async def process_and_upload_file(
        self, article: Content
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """Process and upload a file to the dataset

        Args:
            article: Content object containing the article information

        Returns:
            Tuple[Optional[str], Optional[str], bool]:
                (dataset_id, document_id, started_successfully)
                dataset_id, document_id: IDs if upload successful, None if failed
                started_successfully: True if parsing started successfully
        """
        dataset = None
        temp_file_path = None
        try:
            
            logging.info(f"Processing article {article.uid} with title: {article.title}")
            logging.info(f"Processing with settings.ragflow_base {settings.ragflow_base}")
            # Create a dataset name using article ID

            dataset_name = f"post_{article.media_type.value}_{article.uid}"

            # Try to get existing dataset or create new one
            try:
                datasets = await asyncio.to_thread(
                    self.rag_object.list_datasets, name=dataset_name
                )
                if datasets:
                    dataset = datasets[0]

            except Exception as e:
                # dataset not found, create new one
                try:
                    dataset = await asyncio.to_thread(
                        self.rag_object.create_dataset,
                        name=dataset_name,
                        avatar="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
                        # parser_config=DataSet.ParserConfig(
                        #     rag=self.rag_object,
                        #     res_dict={
                                

                        #         "html4excel": False,
                        #         "layout_recognize": "Naive",
                        #         "raptor": {},
                        #         "task_page_size": 12,
                        #         "chunk_token_num": 128,
                        #         "delimiter": "\n.!?;。；！？,:：，",
                        #         "pages": [[1, 1024]],
                        #     },
                        # ),
                        embedding_model="text-embedding-3-small@Azure-OpenAI",
                    )
                except Exception as e:
                    logger.error(
                        f"Dataset not exist, and error creating dataset: {str(e)}"
                    )
                    return None, None, False

            content, file_extension, is_text_file = await self._get_content_and_file_info(article)

            if not str(content).strip():  # Ensure content is a string and strip it
                logger.warning(
                    f"Skipping article {article.id} due to empty content after processing"
                )
                if dataset:
                    await asyncio.to_thread(
                        self.rag_object.delete_datasets, ids=[dataset.id]
                    )
                return None, None, False

            # Create a temporary file
            with tempfile.NamedTemporaryFile(
                mode="w+" if is_text_file else "w+b",
                suffix=file_extension,
                delete=False,
            ) as temp_file:
                
                temp_file_path = temp_file.name
                if is_text_file:
                    # Ensure content is a string before writing to text file
                    if isinstance(content, bytes):
                        content = content.decode('utf-8', errors='replace')
                    temp_file.write(content)
                else:
                    # Download the file
                    async with aiohttp.ClientSession() as session:
                        async with session.get(content) as response:
                            content_bytes = await response.read()
                            # For binary mode, we need to use binary write
                            if hasattr(temp_file, 'buffer'):
                                temp_file.buffer.write(content_bytes)
                            else:
                                temp_file.write(content_bytes)

            # Clean and truncate title for display name
            safe_title = self._clean_filename(article.title)
            truncated_title = self._truncate_title(safe_title)

            # Upload the document to the dataset
            with open(temp_file_path, "rb") as f:
                file_content = f.read()

            documents = await asyncio.to_thread(
                dataset.upload_documents,
                [
                    {
                        "display_name": f"{truncated_title}{file_extension}",
                        "blob": file_content,
                    }
                ],
            )

            if article.media_type == ContentMediaType.pdf:
                documents_in_dataset = dataset.list_documents(id=documents[0].id)
                if documents_in_dataset:
                    documents_in_dataset[0].update(
                        {
                            "parser_config": {
                                "layout_recognize": "Plain Text",
                                "auto_keywords": 0,
                                "auto_questions": 0,
                                "raptor": {
                                    "use_raptor": False,
                                },
                                "task_page_size": 12,
                                "chunk_token_num": 128,
                                "delimiter": "\n.!?;。；！？,:：，",
                                "pages": [[1, 1024]],
                            }
                        },
                    )

            # Clean up the temporary file
            if temp_file_path:
                os.unlink(temp_file_path)

            if documents:
                doc_id = documents[0].id
                # Start parsing the document
                dataset.async_parse_documents([doc_id])
                # Return IDs and success status, but don't wait for completion
                return dataset.id, doc_id, True

            # If we get here without documents, clean up the dataset
            if dataset:
                await asyncio.to_thread(
                    self.rag_object.delete_datasets, ids=[dataset.id]
                )
            return None, None, False

        except Exception as e:
            logger.error(
                f"Error processing and uploading file for article {article.id}: {str(e)}"
            )
            # Clean up resources in case of error
            if temp_file_path:
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass
            if dataset:
                try:
                    await asyncio.to_thread(
                        self.rag_object.delete_datasets, ids=[dataset.id]
                    )
                except Exception:
                    pass
            return None, None, False

    async def get_document_status(
        self, dataset_id: str, doc_id: str
    ) -> Tuple[str, Optional[str]]:
        """Get document processing status

        Args:
            dataset_id: Dataset ID
            doc_id: Document ID

        Returns:
            Tuple[str, Optional[str]]: (status, error_message)
            status can be one of: UNSTART, RUNNING, CANCEL, DONE, FAIL
            error_message will be None if no error occurred
        """
        try:
            # 将同步操作包装在 to_thread 中
            dataset = await asyncio.to_thread(
                self.rag_object.list_datasets, id=dataset_id
            )
            if not dataset:
                return "FAIL", "Dataset not found"

            dataset = dataset[0]
            docs = await asyncio.to_thread(dataset.list_documents, id=doc_id)
            if not docs:
                return "FAIL", "Document not found"

            doc = docs[0]
            error_msg = None

            if doc.run == "FAIL":
                error_msg = doc.progress_msg or "Document processing failed"


            logger.info(f"Document processing, chunk size is {doc.chunk_count}")
            if doc.run == "DONE" and doc.chunk_count < 1:
                return "FAIL", "Document processing failed, no chunks found"
            
            return doc.run, error_msg

        except Exception as e:
            logger.error(f"Error getting document status: {str(e)}")
            return "FAIL", str(e)

    async def wait_for_document_processing(
        self,
        dataset_id: str,
        doc_id: str,
        timeout_seconds: int = 1200,  # 20分钟超时
        check_interval_seconds: int = 2,  # 每2秒检查一次
    ) -> Tuple[bool, Optional[str]]:
        """Wait for document processing to complete with timeout

        Args:
            dataset_id: Dataset ID
            doc_id: Document ID
            timeout_seconds: Maximum time to wait in seconds
            check_interval_seconds: Time between status checks in seconds

        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
            success: True if document processing completed successfully
            error_message: Error message if processing failed, None otherwise
        """
        start_time = time.time()

        while True:
            # Check if we've exceeded the timeout
            if time.time() - start_time > timeout_seconds:
                return (
                    False,
                    f"Document processing timed out after {timeout_seconds} seconds",
                )

            # Get current status
            status, error_msg = await self.get_document_status(dataset_id, doc_id)
            logger.info(f"Document processing status: {status}, error_msg: {error_msg}")
            if status == "DONE":
                return True, None
            elif status == "FAIL":
                return False, error_msg
            elif status in ["UNSTART", "RUNNING"]:
                # Wait before checking again
                await asyncio.sleep(check_interval_seconds)
            else:  # CANCEL or unknown status
                return (
                    False,
                    f"Document processing ended with unexpected status: {status}",
                )

    async def check_document_ready(
        self, dataset_id: str, doc_id: str
    ) -> Tuple[bool, Optional[str]]:
        """Check if a document is ready (processed successfully)

        Args:
            dataset_id: Dataset ID
            doc_id: Document ID

        Returns:
            Tuple[bool, Optional[str]]:
                (is_ready, status_or_error)
                is_ready: True if document processing completed successfully
                status_or_error: Current status if not ready, or error message if failed
        """
        try:
            status, error_msg = await self.get_document_status(dataset_id, doc_id)

            if status == "DONE":
                return True, None
            elif status == "FAIL":
                return False, error_msg or "Processing failed"
            else:
                return False, status  # UNSTART, RUNNING, CANCEL or other status

        except Exception as e:
            logger.error(f"Error checking document status: {str(e)}")
            return False, str(e)

    async def process_document_in_background(
        self,
        dataset_id: str,
        doc_id: str,
        callback=None,
        timeout_seconds: int = 600,  # 10分钟超时
        check_interval_seconds: int = 5,  # 每5秒检查一次
    ) -> asyncio.Task:
        """Process a document in the background with optional callback when done

        Args:
            dataset_id: Dataset ID
            doc_id: Document ID
            callback: Optional callback function that accepts (dataset_id, doc_id, success, error_msg)
            timeout_seconds: Maximum time to wait in seconds
            check_interval_seconds: Time between status checks in seconds

        Returns:
            asyncio.Task: Background task that can be awaited or cancelled
        """

        async def _background_process():
            success, error_msg = await self.wait_for_document_processing(
                dataset_id,
                doc_id,
                timeout_seconds=timeout_seconds,
                check_interval_seconds=check_interval_seconds,
            )

            if callable(callback):
                try:
                    callback(dataset_id, doc_id, success, error_msg)
                except Exception as e:
                    logger.error(f"Error in document processing callback: {str(e)}")

            return success, error_msg

        # Create and return the task without awaiting it
        task = asyncio.create_task(_background_process())
        return task


rag_utils = RAGUtils(rag_object)
