import logging
import os
import time
from typing import Optional, List
from datetime import datetime
import aiofiles

import boto3
import botocore.exceptions
import httpx
from fastapi import APIRouter, UploadFile, status, Request, File
from pydantic import BaseModel, Field
from app.config import settings, StorageType
from app.common import CommonResponse, ResponseCode, success, failed_with_code
import aioboto3

logger = logging.getLogger(__name__)


class ObjectStorage:
    async def exist(self, uri: str) -> bool:
        raise NotImplementedError

    async def save(self, uri: str, file: bytes):
        raise NotImplementedError

    async def search(self, filename: str, uri: str = None) -> list:
        raise NotImplementedError

    async def download(self, uri: str) -> bytes:
        raise NotImplementedError

    def get_url(self, uri: str) -> str:
        raise NotImplementedError


class LocalStorage(ObjectStorage):
    """Local storage implementation.
    Note: Just for demo purpose, not for production.
    """

    def __init__(self, root_path: str, url_prefix=None):
        """Initialize the local storage.
        @param root_path: The root path in the system.
        """
        if not os.path.exists(root_path):
            os.makedirs(root_path)

        self.root_path = root_path
        self.url_prefix = url_prefix

    async def exist(self, uri):
        """Check if the file exists.
        @param uri: The URI of the file.
        @return: True if the file exists, otherwise False.
        """
        return os.path.exists(os.path.join(self.root_path, uri))

    async def save(self, uri, file=None):
        """Save the file.
        @param uri: The URI of the file.
        @param file: The file to save.
        @return: The URI of the saved file.
        """
        # Construct the full file path
        file_path = os.path.join(self.root_path, uri)

        # Create all intermediate directories in the URI
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # If a file is provided, save it
        if file:
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(file)

    async def download(self, uri) -> bytes:
        file_path = os.path.join(self.root_path, uri)
        if os.path.isdir(file_path):
            raise IsADirectoryError(
                "The file is a directory. path: {}".format(file_path)
            )
        async with aiofiles.open(file_path, "r") as f:
            return await f.read()

    async def search(self, filename, uri=None):
        path = os.path.join(self.root_path, uri) if uri else self.root_path
        file_paths = await self._search_file(filename, path)
        return [fp.replace(self.root_path, "") for fp in file_paths]

    async def _search_file(self, filename: str, path: str):
        file_paths = []
        for entry in os.scandir(path):
            if entry.is_file() and entry.name == filename:
                file_paths.append(entry.path)
            elif entry.is_dir():
                file_paths.extend(await self._search_file(filename, entry.path))
        return file_paths

    def get_url(self, uri):
        """Get the URL of the file.
        @param uri: The URI of the file.
        @return: The URL of the file.
        """
       
        url = os.path.join(self.url_prefix, uri) if self.url_prefix else uri
        return url.replace(" ", "%20")
        


class S3Storage(ObjectStorage):
    """S3 storage implementation.
    Credentials configuration - see https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration
    """

    def __init__(self, bucket_name: str, prefix=None, endpoint_url=None):
        if not self._check_bucket_exist(bucket_name):
            raise RuntimeError("S3 Bucket {} not found".format(bucket_name))
        self.bucket_name = bucket_name
        self.prefix = prefix
        self.endpoint_url = endpoint_url
        self.session = aioboto3.Session()

    def _check_bucket_exist(self, bucket_name: str) -> bool:
        """Check if the bucket exists."""
        s3 = boto3.client("s3")
        try:
            s3.head_bucket(Bucket=bucket_name)
            return True
        except botocore.exceptions.ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                return False
            if error_code == "403":
                return True
            raise e

    def _get_object_key_name(self, uri: str) -> str:
        """Get the object key name."""
        if self.prefix:
            return os.path.join(self.prefix, uri)
        return uri

    async def exist(self, uri: str) -> bool:
        """Check if the file exists."""
        async with self.session.client("s3") as s3:
            try:
                await s3.get_object(Bucket=self.bucket_name, Key=self._get_object_key_name(uri))
                return True
            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return False
                else:
                    raise e

    async def save(self, uri: str, file: bytes = None):
        """Save file to S3."""
        if not file:
            # Ignore folder creation
            return

        async with self.session.client("s3") as s3:
            await s3.put_object(
                Bucket=self.bucket_name, 
                Key=self._get_object_key_name(uri), 
                Body=file
            )

    async def search(self, filename, uri=None) -> List[str]:
        """Search the file."""
        async with self.session.client("s3") as s3:
            prefix = self._get_object_key_name(uri) if uri else ""
            response = await s3.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            uris = [
                obj["Key"] for obj in response["Contents"] if obj["Key"].endswith(filename)
            ]
            # replace prefix
            if self.prefix:
                uris = [uri.replace(self.prefix, "") for uri in uris]

            return uris

    async def download(self, uri: str) -> bytes:
        """Download the file."""
        async with self.session.client("s3") as s3:
            try:
                response = await s3.get_object(
                    Bucket=self.bucket_name, 
                    Key=self._get_object_key_name(uri)
                )
                # For aioboto3, we need to await the body read
                return await response["Body"].read()
            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    raise FileNotFoundError("File not found: {}".format(uri))
                else:
                    raise e

    def get_url(self, uri: str) -> str:
        """Presign the URL of the file."""
        if self.endpoint_url:
            url = os.path.join(self.endpoint_url, self.prefix, uri)
            return url.replace(" ", "%20")

        return None


if settings.storage_type == StorageType.LOCAL:
    storage_path = settings.local_storage_path
    if not os.path.exists(storage_path):
        os.makedirs(storage_path)
    full_url = settings.server_url.rstrip("/") + settings.local_storage_url_prefix
    storage = LocalStorage(root_path=storage_path, url_prefix=full_url)
elif settings.storage_type == StorageType.S3:
    storage = S3Storage(
        bucket_name=settings.s3_bucket_name,
        prefix=settings.s3_prefix,
        endpoint_url=settings.s3_endpoint_url,
    )
else:
    raise ValueError("Invalid storage type: {}".format(settings.storage_type))

DEFAULT_UPLOAD_PATH = "uploads"

async def init_storage():
    if not await storage.exist(DEFAULT_UPLOAD_PATH):
        await storage.save(DEFAULT_UPLOAD_PATH)

router = APIRouter(prefix="/api/files", tags=["Files"])

@router.on_event("startup")
async def startup_event():
    await init_storage()


class FileEntityResponse(BaseModel):
    url: str = Field(
        description="The URL of the uploaded file.",
        example="http://localhost:8000/storage/uploads/1692757218-a.png",
    )


class UploadAndCheckFaceResponse(BaseModel):
    url: str = Field(
        description="The URL of the uploaded file.",
        example="http://localhost:8000/storage/uploads/1692757218-a.png",
    )
    face_check_warning: str = Field(
        description="Warning message if face check result not good, default is empty which means the check result is "
                    "good.",
        example="too many faces",
    )
    find_face_count: int = Field(
        description="face count.",
        example=1,
    )


# check upload file size
def upload_file_size_is_valid(file: UploadFile, max_file_size: Optional[int] = None) -> bool:
    max_size = settings.max_file_size if max_file_size is None else max_file_size

    if file.size > max_size:
        return False

    return True


def upload_file_type_is_valid(file: UploadFile, file_extensions: Optional[str] = None) -> bool:
    extensions = settings.allowed_extensions if file_extensions is None else file_extensions

    if settings.allowed_extensions and file.content_type not in extensions:
        return False

    return True


def upload_file(file: UploadFile) -> dict:
    """
    Upload a file to the server and check if it meets certain criteria.
    :param file: The file to upload, of type UploadFile (fastapi).
    :return: A dictionary with the url of the uploaded file, or an error message if the upload failed.
    """
    # check file size
    if upload_file_size_is_valid(file) is False:
        return {"code": ResponseCode.FILE_SIZE_TOO_LARGE, "message": "File size is too large.", "data": {"url": ""}}

    # check file type, only allow images
    if upload_file_type_is_valid(file) is False:
        return {"code": ResponseCode.FILE_TYPE_NOT_SUPPORTED,
                "message": "File type is not allowed. only allow: {}".format(settings.allowed_extensions),
                "data": {"url": ""}}

    # add device id to the file name
    uri = os.path.join(DEFAULT_UPLOAD_PATH, f"{int(time.time())}-{file.filename}")

    # save the file
    file_content = file.file.read()
    storage.save(uri, file_content)

    return {"code": ResponseCode.SUCCESS, "message": "File uploaded successfully.",
            "data": {"url": storage.get_url(uri)}}


@router.post(
    "/upload_and_check_face",
    status_code=status.HTTP_200_OK,
    summary="Upload image to server and check if there are faces in it, returns uploaded image url and warning message "
            "while face-checking is not good.",
    description="""
    [FILE_SIZE_TOO_LARGE, FILE_TYPE_NOT_SUPPORTED, FACE_CHECK_FAILED]
""",
    response_model=CommonResponse[UploadAndCheckFaceResponse],
)
async def upload_and_check_face(file: UploadFile):
    upload_result = upload_file(file)
    logger.info(f"upload result: {upload_result}")
    if upload_result["code"] != ResponseCode.SUCCESS:
        # handle upload failed
        return failed_with_code(upload_result["code"], upload_result["message"],
                                data=UploadAndCheckFaceResponse(url="", face_check_warning="", find_face_count=0))

    input_path = upload_result["data"]["url"]

    async with httpx.AsyncClient() as client:
        try:
            params = {"input_path": input_path}
            logging.info(f"start reti face: {settings.ms_api_url}/retaina_face")
            response = await client.get(f"{settings.ms_api_url}/retaina_face", params=params)

            response.raise_for_status()
            body = response.json()
            logger.info(f"uploaded result: {upload_result}")
            logger.info(f"response from ms api: {body}")

            scores = body.get("scores", [])
            face_count = len(scores)
            face_check_warning = ""

            if face_count != 1 or scores[0] < 0.8:
                face_check_warning = "This photo may not suitable for the template or has clarity issues.This may " \
                                     "lead to suboptimal results."

            return success(UploadAndCheckFaceResponse(url=input_path, face_check_warning=face_check_warning,
                                                      find_face_count=face_count))
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error when calling ms api: {e}")
            return failed_with_code(ResponseCode.FAILED, f"HTTP error when calling ms api: {e}",
                                    data=UploadAndCheckFaceResponse(url=input_path, face_check_warning="",
                                                                    find_face_count=0))
        except httpx.RequestError as e:
            logger.error(f"error when calling ms api: {e}")
            return failed_with_code(ResponseCode.FAILED, f"error when calling ms api: {e}",
                                    data=UploadAndCheckFaceResponse(url=input_path, face_check_warning="",
                                                                    find_face_count=0))


@router.post(
    "upload",
    status_code=status.HTTP_200_OK,
    summary="Upload file to server",
    description="""
    [FILE_SIZE_TOO_LARGE, FILE_TYPE_NOT_SUPPORTED]
""",
    response_model=CommonResponse[FileEntityResponse],
)
async def upload(file: UploadFile) -> FileEntityResponse:
    upload_result = upload_file(file)

    if upload_result["code"] != ResponseCode.SUCCESS:
        # handle error response
        return failed_with_code(upload_result["code"], upload_result["message"], data={"url": ""})
    else:
        # handle success response
        return success({"url": upload_result["data"]["url"]})


# @router.get(
#     "",
#     status_code=status.HTTP_200_OK,
#     summary="Get file url",
#     description="""[FILE_NOT_FOUND]""",
#     response_model=CommonResponse[FileEntityResponse],
# )
# def get_url(uri: str) -> FileEntityResponse:
#     try:
#         return success(
#             {
#                 "url": storage.get_url(uri),
#             }
#         )
#     except FileNotFoundError as e:
#         return failed_with_code(ResponseCode.FILE_NOT_FOUND, str(e))


# @router.post("/upload", response_model=CommonResponse)
# async def upload(request: Request, file: UploadFile = File(...)):
#     """Upload file."""
#     try:
#         # Check if the upload directory exists
#         if not await storage.exist(DEFAULT_UPLOAD_PATH):
#             await storage.save(DEFAULT_UPLOAD_PATH)
#
#         # Generate file name
#         file_name = file.filename
#         timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
#         uri = os.path.join(DEFAULT_UPLOAD_PATH, f"{timestamp}_{file_name}")
#
#         # Read and store file
#         file_content = await file.read()
#         await storage.save(uri, file_content)
#
#         return success({"uri": uri})
#     except Exception as e:
#         logger.error("Failed to upload file: {}".format(str(e)))
#         return failed_with_code(ResponseCode.UPLOAD_FAILED)
