import json
import logging
import asyncio
import time
from typing import Iterator, List, Union, AsyncIterator

import nanoid
from app.libs.rag.ragflow_sdk.ragflow  import Chat
from app.config import settings
from app.libs.rag.rag_object import rag_object


logger = logging.getLogger(__name__)

class DocumentChat:
    def __init__(self, dataset_ids: List[str], assistant_name: str):
        """Initialize chat with multiple datasets
        
        Args:
            dataset_ids: List of dataset IDs to chat with
        """
        self.dataset_ids = dataset_ids
        self.assistant_name = assistant_name
        self.assistant = None
        self.session = None

    async def initialize(self):
        """Initialize the chat assistant asynchronously"""
        self.assistant = await self._create_chat_assistant()
        await asyncio.to_thread(
            self.assistant.update,
            update_message={
                "name": self.assistant_name,
                "dataset_ids": self.dataset_ids,
                "llm": {
                    "frequency_penalty": 0.7,
                    "presence_penalty": 0.4,
                    "temperature": 0.1,
                    "top_p": 0.3
                },
                "prompt": {
                    "tavily_api_key": settings.tavily_api_key,
                }
            }
        )
        return self

    async def _create_chat_assistant(self):
        """Create a chat assistant for the datasets"""
        try:
            chats = await asyncio.to_thread(rag_object.list_chats, name=self.assistant_name)
            if chats:
                return chats[0]
        except Exception as e:
            logger.error(f"Error getting existing chat assistant: {str(e)}")
            # Continue to create new assistant if getting existing one fails

        try:
            return await asyncio.to_thread(
                rag_object.create_chat,
                name=self.assistant_name,
                dataset_ids=self.dataset_ids,
            )
        except Exception as e:
            logger.error(f"Error creating chat assistant: {str(e)}")
            raise

    async def _get_or_create_session(self):
        """Get or create a session for chat"""
        try:
            # self.assistant.post
            sessions = await asyncio.to_thread(self.assistant.list_sessions)
            if sessions:
                self.session = sessions[0]
            else:
                self.session = await asyncio.to_thread(
                    self.assistant.create_session,
                    name=f"session - {time.strftime('%Y-%m-%d %H:%M:%S')}"
                )
            return self.session
        except Exception as e:
            logger.error(f"Error getting or creating session: {str(e)}")
            raise

    async def chat(self, question: str, stream: bool = True) -> Union[str, AsyncIterator[str]]:
        """
        Chat with the assistant about all documents in the datasets
        
        Args:
            question: User's question
            stream: Whether to stream the response
            
        Returns:
            Response from the assistant (string or AsyncIterator[str])
        """
        try:
            session = await self._get_or_create_session()
            if stream:
                # 对于流式响应，我们需要在异步生成器中处理每个块
                async def async_generator():
                    try:
                        # 在线程池中获取同步迭代器
                        sync_iterator = await asyncio.to_thread(session.ask, question, stream=True)
                        # 遍历同步迭代器中的每个块
                        while True:
                            try:
                                # 在线程池中获取下一个块
                                chunk = await asyncio.to_thread(next, sync_iterator, None)
                                if chunk is None:
                                    break
                                yield chunk
                            except StopIteration:
                                break
                            except Exception as e:
                                logger.error(f"Error getting next chunk: {str(e)}")
                                yield f"Error: {str(e)}"
                                break
                    except Exception as e:
                        logger.error(f"Stream error: {str(e)}")
                        yield f"Error: {str(e)}"
                return async_generator()
            else:
                # 非流式响应直接使用 to_thread
                return await asyncio.to_thread(session.ask, question, stream=False)
        except Exception as e:
            logger.error(f"Chat error: {str(e)}")
            return f"Error: {str(e)}"


async def create_document_chat(dataset_ids: List[str], assistant_name: str) -> DocumentChat:
    """Create and initialize a new document chat instance"""
    chat = DocumentChat(dataset_ids, assistant_name)
    return await chat.initialize()


# async def create_agent_chat(dataset_ids: List[str]) -> DocumentChat:
#     """Create and initialize a new agent chat instance"""
#     agents = rag_object.list_agents()
#     agent = agents[0] if agents else None

#     if not agent:
#         raise ValueError("No agent found")
    
#     return agent.create_session(
#         {
#             "datasets": json.dumps(dataset_ids),
#         }
#     )