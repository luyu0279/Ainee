import json
import logging
from anthropic_bedrock import BaseModel
from langchain_core.prompts import ChatPromptTemplate

from app.common import detect_lang, extract_json, image_url_resize_and_to_base64, retry_async
from app.database.repositories import content_repository
from app.libs.llm.index import llm
from langchain_core.messages import HumanMessage
from app.libs.llm.llm_clients import llm_image, llm_gpt_4o
from pydantic import Field
logger = logging.getLogger(__name__)

summary_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            """,
        ),
        ("user", """
            Create a clear and concise summary of the input text content, and make sure your output is in {output_language}.
            ## **Output with markdown**
            ===== output sample start ===
            ### **One-Sentence Hook**
            Write one engaging sentence to capture attention
            ### **Key Points**
            - List 3-6 main ideas
            - Each point on a new line
            - Clearly express core concepts
            ### **Tags**
            - Use 4 tags maximum per article, with hashtag prefix
            The text content is: \n\n{content_text}"""),
    ]
)

markdownmap_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
             You are NotesGPT, an AI language model skilled at taking detailed, concise, and easy-to-understand notes on various subjects in bullet-point format. When provided with a passage or transcript or a topic, your task is to:
            - Create advanced bullet-point notes summarizing the important parts of the reading or topic.Please choose an appropriate EMOJI for Heading level 2 in Markdown and place it in front of the title.Please summarize this content into one sentence as Heading level 1, please keep the Heading level 1 as short as possible, and ensure there are at least 3 Heading level 2s.
            - Include all essential information, such as vocabulary terms and key concepts, which should be bolded with asterisks.Do not remove any essential information i.e., add as much nuance on all areas from the source without extrapolating beyond the source. Highlight important concepts or technical terms in markdown.
            - Remove any extraneous language, focusing only on the critical aspects of the passage or topic.
            - Strictly base your notes on the provided information, without adding any external information.
            Important note: 
            - Make sure your output is in {output_language}.
            - strictly response in MARKDOWN format
            - Provide only the markdown result, no unnecessary details.
        """,
        ),
        ("user", "There is the content need to be processed:: \n{content_text}"),
    ]
)

tags_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            # Important note: Make sure your output is in {output_language}.
            ## Tagging Guidelines
            - Use 4 tags maximum per article
            - Prefer standard terms over abbreviations
            - Avoid synonyms and redundant terms
            - Tags must directly relate to core themes
            - Maintain consistency with existing tags
            - Combine related subtopics into broader categories
            ## Examples
            - AI impact on jobs: Artificial Intelligence, Job Market, Employment, Future Trends
            - Renewable energy: Renewable Energy, Solar Power, Wind Power, Environmental Sustainability
            - Electric vehicles: Electric Vehicles, Climate Change, Automotive Industry, Technology Advancements
        """,
        ),
        ("user", "Here is the content to process: \n{content_text}"),
    ]
)

recommand_reason_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
            # Important note: Make sure your output is in {output_language}.
            Generate a one-sentence recommendation.
            Keep it concise and accurate. No extra comments.
        """,
        ),
        ("user", "Here is the content to process::: \n{content_text}"),
    ]
)

class MermaidModel(BaseModel):
    """Model representing the structured output of AI-generated Mermaid diagram."""

    mermaid: str

class TagsModel(BaseModel):
    """Model representing the structured output of AI-generated tags."""

    tag_list: list[str]


ai_tags_structured_llm = llm.with_structured_output(TagsModel)


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def get_content_summary(content: str) -> str:
    logger.info(f"content is: {content[:10000]}, lang is {detect_lang(content)}")
    prompt = await summary_prompt.ainvoke({"content_text": content, "output_language": detect_lang(content)})

    result = await llm.ainvoke(prompt)

    if not result.content:
        raise Exception("Failed to generate summary")


    return result.content


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def get_markdownmap(content: str) -> str:
    logger.info(f"content is: {content[:20]}, lang is {detect_lang(content)}")
    prompt = await markdownmap_prompt.ainvoke({"content_text": content, "output_language": detect_lang(content)})

    result = await llm.ainvoke(prompt)

    if not result.content:
        raise Exception("Failed to generate markdown map")
    
    return result.content


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def get_recommend_reason(content: str) -> str:
    logger.info(f"content is: {content[:20]}, lang is {detect_lang(content)}")
    prompt = await recommand_reason_prompt.ainvoke({"content_text": content,  "output_language": detect_lang(content)})
    result = await llm.ainvoke(prompt)

    if not result.content:
        raise Exception("Failed to generate recommendation reason")
    
    return result.content


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def get_tags(content: str) -> str:
    logger.info(f"content is: {content[:20]}, lang is {detect_lang(content)}")
    prompt = await tags_prompt.ainvoke({"content_text": content, "output_language": detect_lang(content)})
    result = await ai_tags_structured_llm.ainvoke(prompt)

    if not result.tag_list:
        raise Exception("Failed to generate tags")
    
    return result.tag_list

class ImageCaptionModel(BaseModel):
    """Model representing the structured output of image captions."""
    
    ocr_result: str = Field(description="Extracted all texts from the image. If no text, left empty")
    content: str = Field(description="Detailed analysis and interpretation of the image")
    title: str = Field(description="Generated title for the image")


image_caption_data_structured_llm = llm_gpt_4o.with_structured_output(ImageCaptionModel)

@retry_async(Exception, tries=3, delay=3, backoff=2)
async def get_image_caption(image_url: str) -> ImageCaptionModel:
    """
    when user send an image, use this tool to read the image
    Input: image_url
    Output: image content
    """
    base64_image = await image_url_resize_and_to_base64(image_url)

    if base64_image is None:
        return "Failed to read the image"

    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": f"""
                    Examine the image carefully. Your task is to identify any text present in the image and transcribe it accurately as the OCR result. Following this, interpret the meaning of the text within the context of the visual elements of the image. Generate a descriptive title for the image that captures its essence. Finally, provide a comprehensive analysis that integrates both the textual and visual information to explain the image's content, purpose, and potential message.

                    Make sure to output everything using the language detected in the input image:
                    """,
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
        ],
    )

    # Invoke the model with the message
    response = await image_caption_data_structured_llm.ainvoke([message])
    
    return response
   
