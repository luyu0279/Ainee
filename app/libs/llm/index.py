import logging
from typing import Any

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import Runnable

from app import settings
from app.database.config import config_repository
from app.libs.llm.llm_clients import llm
from app.libs.llm.tool_define import get_available_tools

logger = logging.getLogger(__name__)

MEMORY_KEY = "chat_history"

async def _create_agent_with_tools() -> Runnable[dict[str, Any], dict[str, Any]]:
    system_config = await config_repository.get_config()

    default_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                f"{system_config.system_prompt}",
            ),
            MessagesPlaceholder(variable_name=MEMORY_KEY),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    # llm_with_tools = llm.bind_tools(agent_tools)

    default_agent = create_tool_calling_agent(llm, get_available_tools(), prompt=default_prompt)

    a = AgentExecutor(agent=default_agent, tools=get_available_tools(), verbose=True).with_config(
        {"run_name": settings.agent_run_name}
    )
    return a
