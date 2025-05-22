import logging
from enum import Enum
from typing import Dict, Any, Optional

from app import settings
from app.context import context_user
from app.libs.llm.followup_question import FollowUpQuestion
from app.libs.llm.models import AgentCompletionResponse, CompletionToolsRequest
from app.libs.llm.tool_define import sgp_quick_get_rate_query_info_from_user, quick_get_refinance_info_from_user, \
    get_tool_display_name, usa_quick_get_rate_query_info_from_user

logger = logging.getLogger(__name__)


class SSEEventType(Enum):
    """Event types for SSE messages"""
    CHAIN_START = "chain_start"
    CHAIN_END = "chain_end"
    MODEL_STREAM = "completion"
    MODEL_END = "model_end"
    TOOL_START = "tool_start"
    TOOL_END = "tool_end"
    ERROR = "error"
    FOLLOW_UP_END = "follow_up_end"
    FOLLOW_UP_START = "follow_up_start"
    CONVERSATION_LIMIT = "conversation_limit"


def event_to_stream_response(response: AgentCompletionResponse):
    return f"data: {response.to_json()}\n\n"


class AcceptedCountryCode(str, Enum):
    USA = "USA"
    SGP = "SGP"


def handle_chain_start(event: Dict[str, Any],
                       completion_request: CompletionToolsRequest) -> AgentCompletionResponse:
    if event["name"] == settings.agent_run_name:
        return AgentCompletionResponse(
            msg_id=completion_request.msg_id,
            event_type=SSEEventType.CHAIN_START,
            event_display_message="Paws tapping and thinking"
        )


def handle_chat_model_stream(event: Dict[str, Any], completion_request: CompletionToolsRequest,
                             text_content: str) -> tuple[AgentCompletionResponse, str] | tuple[None, str]:
    content = event["data"]["chunk"].content

    # Check if content is a list of dictionaries
    # claude model
    if isinstance(content, list):
        for item in content:
            if 'text' in item:
                text_content += item['text']

    # If content is a string, directly append it to text_content
    # openai model
    elif isinstance(content, str):
        text_content += content

    # Return the response and updated text_content
    if text_content:
        return AgentCompletionResponse(
            msg_id=completion_request.msg_id,
            event_type=SSEEventType.MODEL_STREAM,
            text=text_content,
            event_display_message="Paws are still typing away"
        ), text_content

    return None, text_content


def handle_chat_model_end(completion_request: CompletionToolsRequest,
                          text_content: str) -> AgentCompletionResponse:
    return AgentCompletionResponse(
        msg_id=completion_request.msg_id,
        event_type=SSEEventType.MODEL_END,
        text=text_content
    )


def handle_chain_end(event: Dict[str, Any], completion_request: CompletionToolsRequest, text_content: str,
                     _follow_up_result: Optional[FollowUpQuestion]) -> AgentCompletionResponse:
    if event["name"] == settings.agent_run_name:
        return AgentCompletionResponse(
            msg_id=completion_request.msg_id,
            event_type=SSEEventType.CHAIN_END,
            text=text_content,
            follow_up_question=_follow_up_result.questions if _follow_up_result else None
        )


def handle_tool_start(event: Dict[str, Any],
                      completion_request: CompletionToolsRequest, text: str, tool_name: str) -> AgentCompletionResponse:
    res = AgentCompletionResponse(
        msg_id=completion_request.msg_id,
        event_type=SSEEventType.TOOL_START,
        text=text,
        tool_name=tool_name,
        tool_display_message=event.get("display_message")
    )

    tool_display_name = get_tool_display_name(tool_name)

    if tool_display_name:
        res.event_display_message = f"Using my [{tool_display_name}] to dig up info, be right back"

    return res


def handle_conversation_limit(completion_request):
    return AgentCompletionResponse(
        msg_id=completion_request.msg_id,
        event_type=SSEEventType.CONVERSATION_LIMIT,
    )


async def handle_tool_end(event: Dict[str, Any], completion_request: CompletionToolsRequest,
                          text: str) -> AgentCompletionResponse:
    response = AgentCompletionResponse(
        msg_id=completion_request.msg_id,
        event_type=SSEEventType.TOOL_END,
        text=text
    )

    tool_name = event.get("name")
    country = context_user.get().self_set_country or AcceptedCountryCode.USA

    if tool_name == quick_get_refinance_info_from_user.name:
        # gen_code = nanoid.generate().lower()
        web_url = f"{settings.web_tool_base_url}/pages/quick_fill/"
        # await tool_web_repository.add_tool_web(gen_code, web_url)

        response.tool = {
            "name": event.get("name"),
            "output_type": "web_url",
            "button_text": "Quick Fill",
            "output": web_url,
            "input": event.get("data", {}).get("input")
        }
    elif tool_name == sgp_quick_get_rate_query_info_from_user.name or tool_name \
            == usa_quick_get_rate_query_info_from_user.name:
        web_url = f"{settings.web_tool_base_url}/pages/loan_rate/#/country"

        response.tool = {
            "name": event.get("name"),
            "output_type": "web_url",
            "button_text": "Quick Fill",
            "output": web_url,
            "input": event.get("data", {}).get("input")
        }

    tool_display_name = get_tool_display_name(tool_name)

    if tool_display_name:
        response.event_display_message = f"[{tool_display_name}] output ready, coming right up"

    return response


def handle_error(e: Exception, completion_request: CompletionToolsRequest) -> AgentCompletionResponse:
    logger.error(f"Error processing event: {str(e)}")
    return AgentCompletionResponse(
        msg_id=completion_request.msg_id,
        event_type=SSEEventType.ERROR,
        error_code=""
    )
