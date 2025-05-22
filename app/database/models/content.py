from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, DateTime, JSON, Enum
from sqlalchemy.sql import func
from app.database.session import Base
from enum import Enum as PyEnum


class ProcessingStatus(PyEnum):
    WAITING_INIT = "waiting_init"  # 等待处理
    PENDING = "pending"  # 处理中
    COMPLETED = "completed"  # 处理完成
    FAILED = "failed"  # 处理失败


class RAGProcessingStatus(PyEnum):
    waiting_init = "waiting_init"     # 等待初始化
    processing = "processing"         # 处理中
    completed = "completed"           # 全部处理完成，所有数据均可用
    partially_completed = "partially_completed"  # 部分处理完成，部分数据可用但不完整
    failed = "failed"                 # 处理失败，无法使用


class ContentMediaType(str, PyEnum):
    # 通过链接上传的文章
    # Content.content 中存储 html 内容，用于在网页的展示。text_content 存储纯文本内容，用于 ai 总结。
    article = "article"
    # youtube 视频
    # Content.media_subtitles 中存储视频字幕，用于在网页的展示。
    video = "video"
    # 同 article
    twitter = "twitter"
    # text_content 存储纯文本内容，用于 ai 总结。 网页展示使用原文件
    pdf = "pdf"
    # 同 pdf
    word = "word"
    # 同 pdf
    excel = "excel"
    # 同 pdf
    text = "text"
    # 同 pdf
    ppt = "ppt"
    # 同 video
    audio = "audio"
    # 同 video
    spotify_audio = "spotify_audio"
    # 同 video
    audio_internal = "audio_internal"
    # 同 video
    audio_microphone = "audio_microphone"
    # description 存储图片描述，ocr 存在新字段
    image = "image"

    text_file = "text_file"  # 纯文本文件

class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True)
    uid = Column(String(50), nullable=False, unique=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    content_hash = Column(String(64), nullable=True)
    site_name = Column(String(100), nullable=True)
    author = Column(String(100), nullable=True)
    lang = Column(String(10), nullable=True)
    published_time = Column(DateTime, nullable=True)
    source = Column(String(2048), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    content = Column(String, nullable=False)
    cover = Column(String(2048), nullable=True)
    images = Column(JSON, nullable=True)
    processing_status = Column(
        Enum(ProcessingStatus), nullable=False, default=ProcessingStatus.PENDING
    )
    is_deleted = Column(Boolean, default=False)
    view_count = Column(Integer, default=0, nullable=False)
    share_count = Column(Integer, default=0, nullable=False)
    text_content = Column(String, nullable=True)  # Plain text version of the content
    ai_summary = Column(String, nullable=True)  # AI generated summary
    ai_recommend_reason = Column(
        String, nullable=True
    )  # AI generated recommendation reason
    ai_mermaid = Column(String, nullable=True)  # AI generated mermaid diagram
    ai_structure = Column(String, nullable=True)  # AI generated structure
    ai_tags = Column(JSON, nullable=True)  # AI generated tags
    media_type = Column(
        Enum(ContentMediaType, name='content_media_type'), nullable=False, default=ContentMediaType.article
    )  # 新增 media_type 字段
    video_duration = Column(Integer, nullable=True)  # 视频时长，单位秒
    media_seconds_duration = Column(Integer, nullable=True, comment="媒体文件的总时长（秒），适用于音频和视频")
    video_subtitles = Column(JSON, nullable=True)  # 视频字幕，存储为JSON格式
    media_subtitles = Column(JSON, nullable=True, comment="媒体文件的字幕，适用于音频和视频")
    video_embed_url = Column(String(2048), nullable=True)  # 视频嵌入地址
    raw_description = Column(String, nullable=True)  # 视频描述
    raw_description = Column(String, nullable=True)  # 从 spotify 或者 youtube 网页获取的原始描述信息
    file_name_in_storage = Column(String(255), nullable=True)  # 文件在存储中的名称
    file_type = Column(String(50), nullable=True)  # 文件类型
    audio_subtitles = Column(JSON, nullable=True)  # 音频字幕，存储为JSON格式
    batch_id = Column(String(50), nullable=True, comment="用于标识批量任务的唯一ID")  # 新增 batch_id 字段
    dataset_id = Column(String(50), nullable=True, comment="用于标识数据集的唯一ID")  # 新增 dataset_id 字段
    dataset_doc_id = Column(String(50), nullable=True, comment="用于标识在数据集中唯一 DOC ID")  # 新增 dataset_id 字段
    rag_status = Column(Enum(RAGProcessingStatus, name='rag_processing_status'), nullable=True, default=RAGProcessingStatus.waiting_init, comment="RAG处理状态")
    image_ocr = Column(String, nullable=True)  # 图片的OCR结果

