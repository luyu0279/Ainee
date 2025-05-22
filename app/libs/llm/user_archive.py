import asyncio
import json
import logging
from typing import List, Dict, Any

from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.api.user.archives import UserArchiveFurtherInfoResponse
from app.common import image_url_resize_and_to_base64, retry_async
from app.database.user_archive import user_archive_repository, UserArchive
from app.libs.llm.llm_clients import llm, llm_image
from app.libs.llm.pdf_parse import trim_to_token_limit
from app.libs.llm.prompts import property_info, mortgage_info, vehicle_info, auto_loan_info, property_owner_info

logger = logging.getLogger(__name__)

summary_prompt = "Summarize the main content. Outline the core details."
LABEL_MORTGAGE = "Mortgage"
LABEL_AUTO_LOAN = "AutoLoan"
LABEL_PERSONAL = "Personal"
LABEL_OTHERS = "Others"

label_summary_prompt = ChatPromptTemplate.from_messages(
    [

        ("system", f"""
            Please automatically recognize and label the file category based on the provided content. Below are the specific categories and recognition guidelines:
            Label Categories:
            - {LABEL_MORTGAGE}
            - {LABEL_AUTO_LOAN}
            - {LABEL_PERSONAL}
            - {LABEL_OTHERS}
            
            Procedure:
            Read the content of the uploaded file.
            Match the file content with the categories above based on keywords and structure.
            Automatically label the file with the corresponding category tag.
            Notes:
            Ensure the file content is clear for accurate recognition.
            If the file contains information from multiple categories, prioritize labeling the primary category.
            For files that cannot be clearly categorized, label as “#Other.”
        """),
        ("user", "The content is: \n{summary_text}")
        # MessagesPlaceholder(variable_name="chat_history"),
    ]
)


class SummaryLabelModel(BaseModel):
    """
    Summary label model
    """
    label: str = Field(description="The label of summary content.", example="Mortgage Documents")


summary_label_structured_llm = llm.with_structured_output(SummaryLabelModel)


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def _get_content_tag_from_summary(upload: UserArchive):
    follow_up_prompt = await label_summary_prompt.ainvoke({
        "summary_text": upload.summary
    })
    r: SummaryLabelModel = await summary_label_structured_llm.ainvoke(follow_up_prompt)
    logger.info(f"Get content tag from summary, upload id is: {upload.id}")
    return await user_archive_repository.update_agent_upload_data_by_id(
        row_id=upload.id,
        update_fields={
            "label": r.label
        }
    )


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def _get_image_summary(upload: UserArchive) -> UserArchive:
    base64_image = await image_url_resize_and_to_base64(upload.url)
    message = HumanMessage(
        content=[
            {"type": "text", "text": summary_prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
        ],
    )
    logger.info(f"Get content summary, upload id is: {upload.id}")

    # Invoke the model with the message
    response = await llm_image.ainvoke([message])
    summary = response.content
    return await user_archive_repository.update_agent_upload_data_by_id(
        row_id=upload.id,
        update_fields={
            "summary": summary
        }
    )


@retry_async(Exception, tries=2, delay=3, backoff=2)
async def _get_pdf_summary(upload: UserArchive) -> UserArchive:
    content = trim_to_token_limit(upload.raw_data)
    message = HumanMessage(
        content=[
            {"type": "text", "text": f"""
            {summary_prompt}\n
            Content: {content}`
            """},
        ],
    )
    logger.info(f"Get content summary, upload id is: {upload.id}")

    # Invoke the model with the message
    response = await llm_image.ainvoke([message])
    summary = response.content
    return await user_archive_repository.update_agent_upload_data_by_id(
        row_id=upload.id,
        update_fields={
            "summary": summary
        }
    )


class UserFurtherInfo(BaseModel):
    """user further info model"""
    info: List[UserArchiveFurtherInfoResponse]


async def _get_further_info_from_pdf(upload: UserArchive):
    extract_info = f"""
        {property_info}
    """

    if upload.label == LABEL_MORTGAGE:
        extract_info += f"\n\n{mortgage_info}"
    elif upload.label == LABEL_AUTO_LOAN:
        extract_info += f"\n\n{vehicle_info}\n\n{auto_loan_info}"

    extract_info += f"\n\n{property_owner_info}"

    if upload.mimetype == "application/pdf":
        further_info_structured_llm = llm.with_structured_output(UserFurtherInfo)

        message = HumanMessage(
            content=f"""
                    Please help me extract the following information from the text.:
                    
                    {extract_info}
                    
                    Text: {trim_to_token_limit(upload.raw_data)}
                """,
        )
    else:
        base64_image = await image_url_resize_and_to_base64(upload.url)
        further_info_structured_llm = llm_image.with_structured_output(UserFurtherInfo)
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": f"""
                    Please help me extract the following information from the image:
                  
                    {extract_info}
                    """},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                },
            ],
        )

    response = await further_info_structured_llm.ainvoke([message])
    # Serialize response info correctly
    serialized_info = [item.json_serialize() for item in response.info]

    logger.info(f"_get_further_info res is: {json.dumps(serialized_info)}")

    return await user_archive_repository.update_agent_upload_data_by_id(
        row_id=upload.id,
        update_fields={
            "further_info": json.dumps(serialized_info)
        }
    )


async def process_file_after_agent_upload_task(upload: UserArchive):
    logger.info(f"Processing file after agent upload task, upload id is: {upload.id}")
    upload_with_summary = ""
    if upload.mimetype.startswith('image'):
        upload_with_summary = await _get_image_summary(upload)
        logger.info(f"get image content summary success, upload id is: {upload_with_summary.id}")
    elif upload.mimetype == "application/pdf":
        if upload.raw_data:
            upload_with_summary = await _get_pdf_summary(upload)
            logger.info(f"get pdf content summary success, upload id is: {upload_with_summary.id}")

    if upload_with_summary:
        upload_with_label = await _get_content_tag_from_summary(upload_with_summary)
        logger.info(f"get content tag from summary success, upload id is: {upload_with_summary.id}")

        if upload_with_label.label == LABEL_MORTGAGE or upload_with_label.label == LABEL_AUTO_LOAN:
            if upload_with_label.mimetype == "application/pdf" or upload_with_label.mimetype.startswith('image'):
                await _get_further_info_from_pdf(upload_with_label)

            logger.info(f"get further info success, upload id is: {upload_with_summary.id}")
