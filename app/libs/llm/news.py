import json
import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.common import retry_async
from app.database.refinance_news_data import RefinanceNewsData
from app.libs.llm.llm_clients import llm

logger = logging.getLogger(__name__)


class FilteringResultModel(BaseModel):
    """
    Summary label model
    """
    country: str = Field(description="The country of the news.", example="SG")
    relevance_score: float = Field(description="The relevance score of the news.", example="65")
    authority_score: float = Field(description="The authority score of the news.", example="20")
    total_score: float = Field(description="The total score of the news.", example="85")


tag_news_structured_llm = llm.with_structured_output(FilteringResultModel)

filtering_prompt = ChatPromptTemplate.from_messages(
    [

        ("system", """
            You are a news filtering expert with a skill for reading and reviewing news headlines and summaries to help filter information for users, selecting content relevant to their interests and filtering out unrelated content.
            Below, you will be provided with an article's title, description, link, content, and publication date. Carefully review this information and score the article based on relevance (70 points) and authority (30 points), with a total possible score of 100 points. 
            If the article's content is entirely relevant to topics such as mortgage refinancing, auto loan refinancing, mortgage rate trends, auto loan rate trends, the real estate market, the interest rate market, or significant financial news, give it a score of 70 for relevance. Otherwise, give it a lower score. For authority, if the article is from a mainstream authoritative media outlet, give it 30 points; if it is from an unknown or minor website, give it a lower score.
            At the same time, you need to determine which country this news is happening in. Please use one of these three labels ('SG', 'US', 'Other'): SG refers to news related to Singaporean users, US refers to news related to American users, and Other refers to news not related to the above two countries.
            
            Below is an example of a response. Please assemble these data in JSON format.
            {{
            "country": "SG",
            "relevance_score": 65,
            "authority_score": 20,
            "total_score": 85,
            }}
            
            
            Restriction:
            Please provide the json output directly. Do not include any additional commentary.
        """),
        ("user", "The news content is: \n{content_text}")
        # MessagesPlaceholder(variable_name="chat_history"),
    ]
)


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def tag_new_with_llm(article: RefinanceNewsData) -> FilteringResultModel:
    published_at_str = article.published_at.strftime("%Y-%m-%dT%H:%M:%SZ") if article.published_at else None

    follow_up_prompt = await filtering_prompt.ainvoke({
        "content_text": json.dumps({
            "title": article.title,
            "description": article.description,
            "url": article.url,
            "content": article.content,
            "published_at": published_at_str
        })
    })

    return await tag_news_structured_llm.ainvoke(follow_up_prompt, {
        "timeout": 60 * 1000
    })
