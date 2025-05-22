import json

from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_community.chat_message_histories.sql import DefaultMessageConverter
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.runnables import RunnableWithMessageHistory, ConfigurableFieldSpec
from sqlalchemy import select, and_
from typing import List, Any
from typing import (
    Sequence,
)
from sqlalchemy.ext.asyncio import create_async_engine

from app import settings
from app.database.session import get_async_session
from app.libs.llm.index import _create_agent_with_tools

async_sql_engine = create_async_engine(settings.jdbc_url, pool_recycle=600)


class CustomSQLChatMessageHistory(SQLChatMessageHistory):
    def __init__(self, *args, max_message_size: int, custom_session_id: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_message_size = max_message_size  # 存储最大消息数量
        # self.converter = CustomConverter("message_store")

    async def aadd_messages(self, messages: Sequence[BaseMessage]) -> None:
        # Add all messages in one transaction
        await self._acreate_table_if_not_exists()
        if not isinstance(messages, list):
            messages = list(messages)

            # Modify messages[1]
        if len(messages) > 1:
            messages[1] = AIMessage(content=messages[1].get('text'))

        async with get_async_session() as session:
            # async with self.session_maker() as session:
            for message in messages:
                try:
                    session.add(self.converter.to_sql_model(message, self.session_id))
                except Exception as e:
                    print(e)
                # await session.commit()

    def _process_messages(self, records) -> List[BaseMessage]:
        """
        Process database records and return messages starting from first human message.

        Args:
            records: Database records (in descending ID order, from newest to oldest)

        Returns:
            List[BaseMessage]: Messages starting from first human message, in ascending order
        """
        if not records:
            return []

        # Reverse records first (now oldest to newest)
        records = list(records)[::-1]

        # Convert and process messages
        messages = []
        found_first_human = False

        for record in records:
            message = self.converter.from_sql_model(record)
            if not found_first_human:
                if message.type == "human":
                    found_first_human = True
                    messages.append(message)
            else:
                messages.append(message)

        return messages

    @property
    def messages(self) -> List[BaseMessage]:  # type: ignore
        """Retrieve latest messages synchronously."""
        with self._make_sync_session() as session:
            result = (
                session.query(self.sql_model_class)
                .where(
                    getattr(self.sql_model_class, self.session_id_field_name) == self.session_id
                )
                .order_by(self.sql_model_class.id.desc())  # Get newest messages first
                .limit(self.max_message_size)
            )
            return self._process_messages(list(result))

    async def aget_messages(self) -> List[BaseMessage]:
        """Retrieve latest messages asynchronously."""
        await self._acreate_table_if_not_exists()

        async with self._make_async_session() as session:
            stmt = (
                select(self.sql_model_class)
                .where(
                    getattr(self.sql_model_class, self.session_id_field_name) == self.session_id
                )
                .order_by(self.sql_model_class.id.desc())  # Get newest messages first
                .limit(self.max_message_size)
            )

            result = await session.execute(stmt)
            return self._process_messages(list(result.scalars()))


def get_messages_by_session_id(session_id: str, max_message_size: int = 50) -> BaseChatMessageHistory:
    return CustomSQLChatMessageHistory(
        session_id=session_id,
        connection=async_sql_engine,
        async_mode=True,
        max_message_size=max_message_size,
        custom_session_id=session_id
    )


async def get_chain_with_history() -> RunnableWithMessageHistory:
    return RunnableWithMessageHistory(
        await _create_agent_with_tools(),
        # Uses the get_by_session_id function defined in the example
        # above.
        get_messages_by_session_id,
        input_messages_key="input",
        history_messages_key="chat_history",
        # history_factory_config=[
        #     ConfigurableFieldSpec(
        #         id="user_id",
        #         annotation=str,
        #         name="User ID",
        #         description="Unique identifier for the user.",
        #         default="",
        #         is_shared=True,
        #     ),
        #     ConfigurableFieldSpec(
        #         id="conversation_id",
        #         annotation=str,
        #         name="Conversation ID",
        #         description="Unique identifier for the conversation.",
        #         default="",
        #         is_shared=True,
        #     ),
        # ],
    )
