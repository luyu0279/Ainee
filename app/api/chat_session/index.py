import logging
from typing import Optional

import nanoid
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from starlette import status
from starlette.requests import Request

from app import settings
from app.common import CommonResponse, success, failed
from app.database.chat_session import chat_session_repository, ChatSession
from app.database.subagents import sub_agents_repository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat_session", tags=["Chat Session"], include_in_schema=True)


class ChatSessionResponse(BaseModel):
    session_id: str = Field(description="The session ID of the chat session.", example="session_id_123456789")


async def create_or_get_chat_session_by_uid(agent_uid: Optional[str]) -> Optional[ChatSession]:
    if agent_uid:
        agent = await sub_agents_repository.get_agent_by_uid(agent_uid)
    else:
        logger.info(f"Using default Ainee agent ID: {settings.ainee_agent_id}")
        agent = await sub_agents_repository.get_agent_by_id(settings.ainee_agent_id)

    if not agent:
        logger.info(f"Agent not found: {agent_uid}")
        return None
    else:
        logger.info(f"Agent: {agent.uid}, {settings.ainee_agent_id == 1}")

    # 当 agent_id 为 Ainee agent ID 时，尝试复用会话
    if agent.id == settings.ainee_agent_id:
        exist_session = await chat_session_repository.get_session_by_agent_id_and_user(agent.id)

        if exist_session:
            return exist_session

    # 其他情况或没有复用会话时，创建新会话
    session_id = nanoid.generate().lower()
    return await chat_session_repository.create_chat_session(agent_id=agent.id, session_id=session_id)


@router.post(
    "/create",
    status_code=status.HTTP_200_OK,
    summary="Create a chat session",
    description="[SUCCESS], [FAILED]",
    response_model=CommonResponse[Optional[ChatSessionResponse]]
)
async def create_session(
        request: Request,
        agent_uid: Optional[str] = Query(
            default=None,
            description="The ID of the agent. If not provided, defaults to the Ainee agent ID."
        )
):
    new_session = await create_or_get_chat_session_by_uid(agent_uid=agent_uid)

    if not new_session:
        return failed(message="Chat session creation failed.")

    return success(data=ChatSessionResponse(session_id=new_session.session_id))
