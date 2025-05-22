import logging
import time
from fastapi import APIRouter, Request, Body
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.libs.rag.ragflow_sdk.modules.agent import Agent
from app.libs.rag.ragflow_sdk.modules.session import Session
from app.libs.rag.ragflow_sdk.ragflow  import RAGFlow
from typing import List, Optional, Dict, Union, Iterator, Tuple
import os
import json
import tempfile
import re
from app import settings
from enum import Enum
import aiohttp
from app.context import context_user
from app.libs.rag.agent_chat import AgentChatResult, create_agent_chat
from app.libs.rag.rag_llm.index import generate_followup_questions
from app.workers.rag import rag_process
from app.api.content.index import process_content_for_list
from app.common import CommonResponse, failed, success
from app.database.models.chat import ChatStartType, SessionRecord
from app.database.models.content import Content, ContentMediaType, ProcessingStatus, RAGProcessingStatus
from app.database.models.knowledge_base import KnowledgeBase
from app.database.repositories.knowledge_base_repository import knowledge_base_repository, content_kb_mapping_repository
from app.database.repositories.content_repository import content_repository
from app.database.repositories.chat_repository import chat_assistant_repository, session_record_repository
from app.api.file.file import storage
from app.libs.rag import rag_object
from app.libs.rag.rag_utils import rag_utils
from app.libs.rag.document_chat import DocumentChat, create_document_chat
from app.workers import rag as rag_worker
import asyncio
logger = logging.getLogger(__name__)
# Initialize RAGFlow client and RAG helper


class ChatAssistantWithSessionsResponse(BaseModel):
    assistants: List[Dict]
    cursor: Optional[str]

class CompletionStatus(str, Enum):
    PROCESSING = "processing"  # 处理中
    COMPLETED = "completed"    # 完成
    ERROR = "error"           # 错误
    FOLOWUP_PREPARING = "followup_preparing"  # 准备 followup_question

class ChatSessionsResponse(BaseModel):
    sessions: List[Dict]
    cursor: Optional[str]
    assistant_info: Dict

class WelcomeFollowUpQuestionResponse(BaseModel):
    followup_question: List[str]


class KBProcessingStatus(str, Enum):
    """Chat available status"""
    AVAILABLE = "available"  # 可用
    PARTIALLY_AVAILABLE = "partially_available"  # 部分可用
    UNAVAILABLE = "unavailable"  # 不可用

class KBProcessingStatusResponse(BaseModel):
    status: KBProcessingStatus
    message: str

class UpdateSessionRequest(BaseModel):
    name: str


async def get_datasets_for_chat(chat_start_type: ChatStartType, uid: Optional[str] = None) -> Tuple[List[str], str, Optional[Content], Optional[KnowledgeBase], int]:
    """
    Get datasets for chat based on the chat start type.
    
    Args:
        chat_start_type: The type of chat to start
        uid: Content or KB UID (required for ARTICLE and SINGLE_KNOWLEDGE_BASE types)
        
    Returns:
        Tuple containing:
        - dataset_ids: List of dataset IDs to use for the chat
        - assistant_name: Name for the assistant
        - session_key: Key to identify the session
        - related_object: Content or KB object (if applicable)
    """
    # Initialize variables
    user = context_user.get()
    content = None
    kb = None
    total_size_when_ready = 0
    dataset_ids = []
    assistant_name=""

    if chat_start_type == ChatStartType.INBOX:
        dataset_ids, total_size_when_ready = await get_user_all_dataset_ids()
        assistant_name = f"{ChatStartType.INBOX.value} - {user.uid}"
        
    elif chat_start_type == ChatStartType.MY_KNOWLEDGE_BASES:
        dataset_ids, total_size_when_ready = await get_user_database_dataset_ids()
        assistant_name = f"{ChatStartType.MY_KNOWLEDGE_BASES.value} - {user.uid}"
        
    elif chat_start_type == ChatStartType.ARTICLE:
        if not uid:
            raise ValueError("Content UID is required for article chat")
            
        content = await content_repository.get_by_uid(uid)
        total_size_when_ready = 1
        if not content:
            raise ValueError("Content not found")
        
        if content.rag_status != RAGProcessingStatus.completed:
            raise ValueError("Content is not ready for chat")
            
        dataset_ids = [content.dataset_id] if content.dataset_id else []
        assistant_name = f"{ChatStartType.ARTICLE.value} - {user.uid} - {uid}"
       
        
    elif chat_start_type == ChatStartType.SINGLE_KNOWLEDGE_BASE:
        if not uid:
            raise ValueError("Knowledge Base ID is required")
        
        # Get knowledge base info for name
        kb = await knowledge_base_repository.get_basic_with_check_access(uid, user.id)
        if not kb:
            raise ValueError("Knowledge Base not found")
            
        dataset_ids, total_size_when_ready = await get_user_single_dataset_ids(kb.id)
        assistant_name = f"{ChatStartType.SINGLE_KNOWLEDGE_BASE.value} - {user.uid} - {uid}"
        
    return dataset_ids, assistant_name, content, kb, total_size_when_ready


async def get_or_create_assistant_session(
    chat_start_type: ChatStartType, 
    assistant_name: str, 
    dataset_ids: List[str],
    content: Optional[Content] = None,
    knowledgeBase: Optional[KnowledgeBase] = None
) -> DocumentChat:
    """
    Get or create an assistant and session based on the chat start type.
    
    Args:
        chat_start_type: The type of chat
        assistant_name: Name for the assistant
        dataset_ids: List of dataset IDs for document chat
        content: Content or KB object (if applicable)
        knowledgeBase: KnowledgeBase to use

    Returns:
        Tuple containing the assistant, session and document chat
    """
    # Find or create the assistant
    
    # Try to find existing assistant by name
    chat_assistant_in_db = await chat_assistant_repository.get_by_name(assistant_name)
    
    # Create document chat with dataset IDs
    doc_chat: DocumentChat = await create_document_chat(dataset_ids, assistant_name)

    if not chat_assistant_in_db:
        chat_assistant_in_db = await chat_assistant_repository.create(
            name=assistant_name,
            chat_start_type=chat_start_type,
            description=f"Assistant for {chat_start_type.value}",
            content_id=content.id if content else None,
            kb_id=knowledgeBase.id if knowledgeBase else None,
        )
            
    if not chat_assistant_in_db:
        raise ValueError("Failed to create assistant")
    
    return doc_chat

router = APIRouter(prefix="/api/chat", tags=["Chat"], include_in_schema=True)

def filter_processed_articles(articles: list[Content]) -> list[Content]:
    """
    筛选出已完成处理的文章
    
    Args:
        articles: 待筛选的文章列表
        
    Returns:
        List[Content]: 已处理完成的文章列表
    """
    return [
        article for article in articles 
        if article.processing_status == ProcessingStatus.COMPLETED and 
           article.rag_status in [RAGProcessingStatus.completed, RAGProcessingStatus.processing]]

async def get_user_all_dataset_ids() -> Tuple[List[str], int]:
    """Get all dataset IDs from user's content"""
    try:
        articles = await content_repository.get_all_rag_read_or_processing_content_without_pagination()
    
        dataset_ids = []
        for article in articles:
            if article.dataset_id and article.rag_status == RAGProcessingStatus.completed:
                dataset_ids.append(article.dataset_id)

        return dataset_ids, len(articles)
    except Exception as e:
        logger.error(f"Error getting dataset IDs: {str(e)}")
        return [], 0
    
async def get_user_database_dataset_ids() -> Tuple[List[str], int]:
    """Get all dataset IDs from user's content"""
    try:
        articles = await knowledge_base_repository.get_kb_contents_from_owned_and_subscribed()
        dataset_ids = []

        processed_articles = filter_processed_articles(articles)

        for article in articles:
            if article.dataset_id and article.rag_status == RAGProcessingStatus.completed:
                dataset_ids.append(article.dataset_id)
        return dataset_ids, len(articles)
    except Exception as e:
        logger.error(f"Error getting dataset IDs: {str(e)}")
        return []
    
async def get_user_single_dataset_ids(kb_id: int) -> Tuple[List[str], int]:
    try:
        content_ids, _ = await content_kb_mapping_repository.get_knowledge_base_contents(
            kb_id=kb_id,
            offset=0,
            limit=1000,
        )

        contents = await content_repository.get_by_ids(content_ids)
        processed_contents = filter_processed_articles(contents)
        dataset_ids = []
        for content in processed_contents:
            if content.dataset_id and content.rag_status == RAGProcessingStatus.completed:
                dataset_ids.append(content.dataset_id)
        return dataset_ids, len(processed_contents)
    except Exception as e:
        logger.error(f"Error getting dataset IDs: {str(e)}")
        return []

def get_references_str(references: List[dict]) -> str:
    """
    获取引用的字符串表示形式，最多返回5条引用
    
    Args:
        references: 引用列表
        
    Returns:
        str: 引用的字符串表示形式
    """
    if not references:
        return ""
    
    reference_str = []
    # 只取前5条引用
    for ref in references[:5]:
        if ref.get('content'):
            content = ref['content']
            if isinstance(content, str):
                content = content.strip()
                reference_str.append(content)

    if not reference_str:
        return ""
    
    return "\n".join(reference_str)


async def enrich_references(chunk_reference):
    """
    获取并丰富引用内容的信息，只包含标题、媒体类型和页面URL

    Args:
        chunk_reference: 原始引用列表

    Returns:
        list: 包含内容信息的引用列表
    """
    try:
        if not chunk_reference:
            return None

        # 获取引用内容的详细信息
        reference_pairs = [(ref['dataset_id'], ref['document_id'])
                           for ref in chunk_reference if ref.get('dataset_id') and ref.get('document_id') and ref['dataset_id'].strip()]
        
        # 获取 document_id 不为空但 dataset_id 为空的引用
        no_dataset_references = [ref for ref in chunk_reference 
                               if ref.get('document_id') and (not ref.get('dataset_id') or not ref['dataset_id'].strip())]
        
        enriched_references = []

        if len(reference_pairs) > 0:
            contents = await content_repository.get_by_dataset_pairs(reference_pairs)

            # 创建 dataset_id 和 document_id 到 content 的映射
            content_map = {
                (content.dataset_id, content.dataset_doc_id): content
                for content in contents
            }

            # 为每个引用添加内容信息
            for ref in chunk_reference:
                if ref.get('dataset_id') and ref.get('document_id'):
                    content = content_map.get((ref['dataset_id'], ref['document_id']))
                    if content:
                        # 只保留需要的字段
                        enriched_ref = {
                            # **ref,
                            "id": ref['id'],
                            "image_id": ref['image_id'],
                            "content": ref['content'],
                            'content_raw': {
                                'source_type': 'internal',
                                'source': content.source,
                                'uid': content.uid,
                                'title': content.title,
                                'media_type': content.media_type.value if content.media_type else None,
                                'page_url': f"{settings.content_detail_page_url}/{content.uid}"
                            }
                        }
                        enriched_references.append(enriched_ref)
        
        if len(no_dataset_references) > 0:
            for ref in no_dataset_references:
                # 只保留需要的字段
                enriched_ref = {
                    "id": ref['id'],
                    "image_id": ref['image_id'],
                    "content": ref['content'],
                    'content_raw': {
                        'source_type': 'external',
                        'source': ref['url'],
                        'uid': None,
                        'title': ref['document_name'],
                        'media_type': ContentMediaType.article.value,
                        'page_url': None,
                    }
                }

                enriched_references.append(enriched_ref)

        return enriched_references
    except Exception as e:
        logger.error(f"Error enriching references: {str(e)}")
        return []  # 出错时返回空列表而不是原始引用


def generate_chat_response(
    content: Optional[str] = None,
    reference: Optional[List[dict]] = None,
    status: CompletionStatus = CompletionStatus.PROCESSING,
    error_message: Optional[str] = None,
    msg_id: Optional[str] = None,
    followup_question: Optional[list] = []
) -> str:
    """
    生成标准格式的聊天响应
    
    Args:
        content: 回答内容
        reference: 引用信息
        status: 完成状态
        error_message: 错误信息
        msg_id: 消息ID
        
    Returns:
        str: JSON格式的响应字符串
    """
    response = {
        "msg_id": msg_id,
        "content": content,
        "reference": reference,
        "status": status,
        "error_message": error_message,
        "followup_question": followup_question,
    }
    return json.dumps(response) + '\n'


@router.get("/chat_available_status", 
    response_model=CommonResponse[KBProcessingStatusResponse]
)
async def chat_available_status(
    chat_start_type: Optional[ChatStartType] = None,
    uid: Optional[str] = None
):
    """Get welcome message"""
    message = 'Some content still analyzing. Current answers are limited to ready data.'

    try:
        dataset_ids, assistant_name, content, knowledgeBase, total_size_when_ready = await get_datasets_for_chat(
            chat_start_type, uid
        )

        if len(dataset_ids) == 0:
            return success(data=KBProcessingStatusResponse(
                status=KBProcessingStatus.UNAVAILABLE,
                message=message
            ))
    
        if len(dataset_ids) < total_size_when_ready:
            return success(data=KBProcessingStatusResponse(
                status=KBProcessingStatus.PARTIALLY_AVAILABLE,
                message=message
            ))
        
        if len(dataset_ids) == total_size_when_ready:
            return success(data=KBProcessingStatusResponse(
                status=KBProcessingStatus.AVAILABLE,
                message=""
            ))
        return None
    except ValueError as e:
        return success(data=KBProcessingStatusResponse(
            status=KBProcessingStatus.UNAVAILABLE,
            message=message
        ))


@router.get("/welcome_follow_up_question", 
    response_model=CommonResponse[WelcomeFollowUpQuestionResponse]
)
async def welcome_follow_up_question(
    chat_start_type: Optional[ChatStartType] = Body(None, embed=True),
    uid: Optional[str] = Body(None, embed=True)
):
    """Get welcome message"""
    
    return success(data=WelcomeFollowUpQuestionResponse(followup_question=["你好，我是你的助手，有什么可以帮你的吗？", "hello world", "have a good day"]))


async def handle_session_lookup(chat_start_type: ChatStartType, uid: Optional[str]) -> Tuple[Optional[SessionRecord], Optional[any]]:
    """Get existing session based on chat start type"""
    session_in_db = None
    
    if chat_start_type == ChatStartType.ARTICLE:
        content = await content_repository.get_by_uid(uid)
        if not content:
            return None, None
        # Note: Session lookup by content ID is commented out in original code
        session_in_db = await session_record_repository.get_by_content_id(content.id)

        if len(session_in_db) == 0:
            return None, content

        return session_in_db[0], content
    elif chat_start_type == ChatStartType.SINGLE_KNOWLEDGE_BASE:
        kb = await knowledge_base_repository.get_basic_with_check_access(uid, context_user.get().id)
        if not kb:
            return None, None
        
        session_in_db = await session_record_repository.get_by_kb_id(kb.id)

        if len(session_in_db) == 0:
            return None, kb

        return session_in_db[0], kb
    elif chat_start_type in [ChatStartType.MY_KNOWLEDGE_BASES, ChatStartType.INBOX]:
        session_in_db = await session_record_repository.get_by_chat_start_type(chat_start_type)
        return session_in_db, None
    return None


async def process_agent_response(response, msg_id: str, reference_str: Optional[str], question: str):
    """Process streaming response from agent"""
    content = ""
    reference = None
    
    # Stream processing chunks
    for chunk in response:
        if chunk:
            content = chunk.content
            reference = chunk.reference if hasattr(chunk, 'reference') else None
            yield generate_chat_response(
                content=content,
                reference=None,
                status=CompletionStatus.PROCESSING,
                msg_id=msg_id
            )
    
    # Signal that followup questions are being prepared
    yield generate_chat_response(
        content=content,
        reference=None,
        status=CompletionStatus.FOLOWUP_PREPARING,
        msg_id=msg_id
    )
    
    # Enrich references and generate followup questions
    enriched_references = await enrich_references(reference) if reference else None
    reference_str = get_references_str(reference) if reference else None
    follow_up_question = await generate_followup_questions(reference_str, question, content)
    
    # Final response with all data
    yield generate_chat_response(
        content=content,
        reference=enriched_references,
        status=CompletionStatus.COMPLETED,
        msg_id=msg_id,
        followup_question=follow_up_question
    )

@router.post("/stream_agent_chat")
async def stream_agent_chat(
    request: Request,
    question: str = Body(..., embed=True),
    msg_id: str = Body(..., embed=True),
    chat_start_type: ChatStartType = Body(..., embed=True),
    uid: Optional[str] = Body(None, embed=True),
    quote_text: Optional[str] = Body(None, embed=True),
    use_web_search: Optional[bool] = Body(False, embed=True),
):
    """Chat with the assistant about documents in specified datasets"""
    async def response_generator():
        try:
            # Get existing session based on chat type
            session_in_db, search_item = await handle_session_lookup(chat_start_type, uid)

            
            # Handle KB not found error for SINGLE_KNOWLEDGE_BASE type
            if chat_start_type == ChatStartType.SINGLE_KNOWLEDGE_BASE and not search_item:
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message="Knowledge Base not found",
                    msg_id=msg_id
                )
                return
            
            if chat_start_type == ChatStartType.ARTICLE and not search_item:
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message="Content not found",
                    msg_id=msg_id
                )
                return
            
            try:
                # Get datasets and context for chat
                dataset_ids, assistant_name, content, knowledgeBase, total_size_when_ready = await get_datasets_for_chat(
                    chat_start_type, uid
                )
            except ValueError as e:
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message=str(e),
                    msg_id=msg_id
                )
                return

            # Check if datasets are available
            if not dataset_ids:
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message="Content not ready yet. First-time setup in progress. Please check back shortly.",
                    msg_id=msg_id
                )
                return
            
            # Create or get agent chat session
            # 根据不同的 ChatStartType 生成对应的 title
            user = context_user.get()
            agent_title = None
            
            if chat_start_type == ChatStartType.INBOX:
                agent_title = f"INBOX_CHAT_{user.uid}_{int(time.time())}"
            elif chat_start_type == ChatStartType.MY_KNOWLEDGE_BASES:
                agent_title = f"MY_KB_CHAT_{user.uid}_{int(time.time())}"
            elif chat_start_type == ChatStartType.ARTICLE:
                agent_title = f"ARTICLE_CHAT_{uid}_{int(time.time())}"
            elif chat_start_type == ChatStartType.SINGLE_KNOWLEDGE_BASE:
                agent_title = f"SINGLE_KB_CHAT_{uid}_{int(time.time())}"
            
            result: AgentChatResult = await create_agent_chat(
                dataset_ids= dataset_ids,
                session_record=session_in_db,
                use_web_search=use_web_search,
                use_web_search_modified=True if session_in_db and session_in_db.use_web_search != use_web_search else False,
                agent_title=agent_title
            )

            agent = result.agent
            new_session = result.session
           
            if session_in_db:
                await session_record_repository.update(
                    session_in_db.id,
                    use_web_search=use_web_search,
                )
            else:
                await session_record_repository.create(
                    chat_start_type=chat_start_type,
                    session_id=new_session.id,
                    content_id=content.id if content else None,
                    kb_id=knowledgeBase.id if knowledgeBase else None,
                    agent_id=agent.id
                )

            # Run question in thread and process response
            ask_fn = lambda: new_session.ask(question, stream=True)
            response = await asyncio.to_thread(ask_fn)
            
            # Process streaming response
            async for chunk in process_agent_response(response, msg_id, None, question):
                yield chunk
                
        except ValueError as e:
            logger.error(f"Session creation error: {str(e)}")
            yield generate_chat_response(
                status=CompletionStatus.ERROR,
                error_message="Unable to create conversation. Please try again later.",
                msg_id=msg_id
            )
                
        except Exception as e:
            logger.error(f"Agent chat error: {str(e)}")
            yield generate_chat_response(
                status=CompletionStatus.ERROR,
                error_message="An unexpected error occurred. Please try again later.",
                msg_id=msg_id
            )

    # Return a streaming response
    return StreamingResponse(response_generator(), media_type='application/x-ndjson')


@router.post("/stream_rag_chat")
async def stream_rag_chat(
    request: Request,
    question: str = Body(..., embed=True),
    msg_id: str = Body(..., embed=True),
    chat_start_type: Optional[ChatStartType] = Body(None, embed=True),
    uid: Optional[str] = Body(None, embed=True),
    quote_text: Optional[str] = Body(None, embed=True),
):
    """Chat with the assistant about documents in specified datasets"""
    async def generate():
        try:
            # Get datasets and assistant/session information
            try:
                dataset_ids, assistant_name, content, knowledgeBase, total_size_when_ready = await get_datasets_for_chat(
                    chat_start_type, uid
                )
            except ValueError as e:
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message=str(e),
                    msg_id=msg_id
                )
                return

            if not dataset_ids or len(dataset_ids) == 0:
                error_message = "Content not ready yet. First-time setup in progress. Please check back shortly."
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message=error_message,
                    msg_id=msg_id
                )
                return
            
            # Get or create assistant and session
            try:
                doc_chat: DocumentChat = await get_or_create_assistant_session(
                    chat_start_type, 
                    assistant_name, 
                    dataset_ids,
                    content=content,
                    knowledgeBase=knowledgeBase
                )
            except ValueError as e:
                error_message = "Unable to create conversation. Please try again later."
                logger.error(f"Session creation error: {str(e)}")
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message=error_message,
                    msg_id=msg_id
                )
                return
                
            # Get response from RAG chat
            response = await doc_chat.chat(question, stream=True)
            
            try:
                last_chunk = None
                logger.info(f"Response: start generate")
                async for chunk in response:
                    try:
                        if last_chunk is not None:
                            yield generate_chat_response(
                                content=last_chunk.content,
                                reference=last_chunk.reference if hasattr(last_chunk, 'reference') else None,
                                status=CompletionStatus.PROCESSING,
                                msg_id=msg_id
                            )
                        last_chunk = chunk
                    except Exception as e:
                        logger.error(f"Error processing chunk: {str(e)}")
                        yield generate_chat_response(
                            status=CompletionStatus.ERROR,
                            error_message="We encountered an issue while generating your answer. Please try asking again or come back later.",
                            msg_id=msg_id
                        )
                        return  # 立即中断流
                
                if last_chunk is not None:
                    try:
                        # 首先发送 FOLLOWUP_PREPARING 状态
                        yield generate_chat_response(
                            content=last_chunk.content,
                            reference=None,  # 此时还没有丰富的引用
                            status=CompletionStatus.FOLOWUP_PREPARING,
                            msg_id=msg_id,
                            followup_question=[]
                        )

                        # 然后进行引用丰富
                        enriched_references = await enrich_references(last_chunk.reference) if hasattr(last_chunk, 'reference') else None
                        reference_str = get_references_str(last_chunk.reference) if hasattr(last_chunk, 'reference') else None
                        # 生成 followup_question

                        follow_up_question = await generate_followup_questions(reference_str, question, last_chunk.content)

                        # 最后发送 COMPLETED 状态，并包含完整信息
                        yield generate_chat_response(
                            content=last_chunk.content,
                            reference=enriched_references,
                            status=CompletionStatus.COMPLETED,
                            msg_id=msg_id,
                            followup_question= follow_up_question
                        )
                    except Exception as e:
                        logger.error(f"Error processing final chunk: {str(e)}")
                        yield generate_chat_response(
                            status=CompletionStatus.ERROR,
                            error_message="An issue occurred while completing your answer. You've received a partial response. For a complete answer, please try again later.",
                            msg_id=msg_id
                        )
            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield generate_chat_response(
                    status=CompletionStatus.ERROR,
                    error_message="We're experiencing technical difficulties processing your question. Please try again later.",
                    msg_id=msg_id
                )
                
        except Exception as e:
            logger.error(f"RAG chat error: {str(e)}")
            yield generate_chat_response(
                status=CompletionStatus.ERROR,
                error_message="Sorry, we couldn't process your request. Your documents may still be processing or there might be a network issue. Please try again later.",
                msg_id=msg_id
            )
    
    # Return a streaming response
    return StreamingResponse(generate(), media_type='application/x-ndjson')
