import math
from enum import Enum
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic.v1 import validator
from pydantic_settings import BaseSettings


class ListConfig:
    def __init__(self, values: List[str]) -> None:
        self._values = values

    def __iter__(self):
        return iter(self._values)

    def __len__(self):
        return len(self._values)

    def __getitem__(self, idx):
        return self._values[idx]

    def __str__(self):
        return str(self._values)

    def __repr__(self):
        return repr(self._values)

    @classmethod
    def from_string(cls, value: str) -> "ListConfig":
        try:
            return cls([v.strip() for v in value.split(",") if v.strip()])
        except Exception as e:
            raise ValueError(f"Invalid configuration: {value}, {str(e)}")


class StorageType(str, Enum):
    LOCAL = "local"
    S3 = "s3"


class ApplicationSettings(BaseSettings):
    # app
    app_name: str = "FaceAI API"
    app_version: str = "0.1.0"
    app_description: str = ""
    in_production: bool = False

    # server
    server_url: str = "http://localhost:8000"

    # storage
    max_file_size: int = 1024 * 1024 * 5  # 5MB
    allowed_extensions: Optional[str] = None
    storage_type: StorageType = StorageType.LOCAL
    local_storage_path: str = "./data"
    local_storage_url_prefix: str = "/storage"
    s3_bucket_name: Optional[str] = None
    s3_prefix: Optional[str] = None
    s3_endpoint_url: Optional[str] = None

    # Modelscope
    ms_api_url: str = "http://10.255.8.188:8000"

    # Rembg
    rembg_api_url: str = "http://10.255.8.163:8887"

    # database
    jdbc_url: str = "sqlite:///./data/db.sqlite3"
    redis_url: str = "redis://localhost:6379/0"

    # user
    audio_api_url: str = "http://127.0.0.1:5000"
    azure_api_version: str
    azure_key: str
    azure_endpoint: str
    gpt_model: str

    # jwt
    jwt_secret: str = "secret"
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 15
    fernet_encryption_key: str = ""

    # web tool base
    web_tool_base_url: str = "http://10.255.8.74:5173"

    # agent
    agent_run_name: str = "ainee-agent"

    # claude
    claude_window_context: int = 200 * 1000
    pdf_process_token_limit: int = math.floor(claude_window_context * 0.6)
    base_llm_model_id: str = ""
    image_llm_model_id: str = ""

    # news
    news_api_key: str = ""

    # firebase
    firebase_private_key: str = ""
    firebase_private_key_id: str = ""

    # Agent configurations
    agent_upload_max_size: int = 1024 * 1024 * 5  # 5MB
    agent_upload_allowed_extensions: str = None

    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    ainee_agent_id: int = 1

    # aws location
    location_index_name: str = ""

    # content
    content_parser_url: str = ""
    content_detail_page_url: str = ""
    kb_share_page_url: str = ""

    google_api_key: str = ""

    google_client_api_key: str = ""

    youtube_caption_cookie: str = ""

    single_audio_max_seconds_duration: int = 60 * 60

    total_audio_max_seconds_duration: int = 60 * 60 * 50

    fal_key: str = ""

    rapidapi_key: str = ""

    ragflow_key: str = ""
    ragflow_base: str = ""

    tavily_api_key: str = ""

    meatabase_webhook_api_key: str = ""

    searchio_api_key: str = ""

    @validator("agent_upload_allowed_extensions")
    def agent_allowed_extensions_validator(cls, value):
        return ListConfig.from_string(value)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings():
    return ApplicationSettings()


# Instance of the global settings
settings = get_settings()
