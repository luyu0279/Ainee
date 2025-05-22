import json
import asyncio
import logging
from typing import List, Optional
from functools import partial
from dataclasses import dataclass

import nanoid
from sqlalchemy import Tuple

from app.database.models.chat import SessionRecord
from app.database.models.content import Content
from app.libs.rag.agent_template import get_template_with_datasets
from app.libs.rag.rag_object import rag_object
from app.libs.rag.ragflow_sdk.modules.agent import Agent
from app.libs.rag.ragflow_sdk.modules.session import Session

logger = logging.getLogger(__name__)

@dataclass
class AgentChatResult:
    """Result container for agent chat creation"""
    session: Optional[Session] = None
    agent: Optional[Agent] = None


async def get_agent(agent_id: str) -> Optional[Agent]:
    """Get an agent by its ID"""
    try:
        list_agents = lambda: rag_object.list_agents(id=agent_id)
        agents = await asyncio.to_thread(list_agents)
        
        if agents:
            return agents[0]
    except Exception as e:
        logger.error(f"Error getting agent: {str(e)}")
    return None


async def create_agent_chat(dataset_ids: List[str], 
                            session_record: Optional[SessionRecord], 
                            use_web_search_modified:Optional[bool] = False,
                            use_web_search: Optional[bool] = False, 
                            agent_title: Optional[str] = None) -> AgentChatResult:
    """Create and initialize a new agent chat instance"""
    
    if session_record:
        agent = await get_agent(session_record.agent_id)
        
        session = None
        # 更新agent的dsl配置
        dsl = agent.dsl.to_json()
        dsl['components']['Retrieval:BeigeBananasSing']['obj']['params']['kb_ids'] = dataset_ids
        dsl['components']['Retrieval:BumpyGroupsRelate']['obj']['params']['kb_ids'] = dataset_ids

        # 遍历 graph nodes，找到 label 为 "Retrival" 的节点并赋值
        if 'graph' in dsl and 'nodes' in dsl['graph']:
            for node in dsl['graph']['nodes']:
                if (
                    node.get('data')
                    and 'form' in node['data']
                    and node['data'].get('label') == "Retrieval"
                ):
                    node['data']['form']['kb_ids'] = dataset_ids
        
        rag_object.update_agent(agent.id, title=agent_title, dsl=dsl)
        
        agent = await get_agent(session_record.agent_id)
        
        if not agent:
            raise ValueError("Agent not found after update")
            
        sessions = agent.list_sessions(id=session_record.session_id)
        if len(sessions) > 0:
            session = sessions[0]
            if use_web_search_modified:
                agent.delete_sessions([session_record.session_id])
                session = agent.create_session(web_search="1" if use_web_search else "0")
            
        else:
            session = agent.create_session(web_search="1" if use_web_search else "0")
        
        return AgentChatResult(agent=agent, session=session)
    else:
        # 使用提供的agent_title，如果没有则生成一个随机ID作为title
        agent_name = agent_title if agent_title else nanoid.generate()
        
        # 使用修改后的模板创建agent
        modified_template = get_template_with_datasets(dataset_ids)
        rag_object.create_agent(title=agent_name, dsl=modified_template)
        list_agents = rag_object.list_agents(title=agent_name)

        agent = None
        if len(list_agents) > 0:
            agent = list_agents[0]
        
        if not agent:
            raise ValueError("No agent found")
        
        session = agent.create_session(web_search="1" if use_web_search else "0")
        
        return AgentChatResult(agent=agent, session=session)
        

