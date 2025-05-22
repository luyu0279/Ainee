import json
import logging
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, TypeVar, Any
from app.common import CommonResponse, extract_json, format_subtitles, merge_subtitles, success, failed, retry_async
import validators
from app.libs.llm.llm_clients import llm, llm_bedrock
from app.libs.llm.content import get_markdownmap
from app.services.youtube_service import YouTubeService
from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatOpenAI
from app.libs.llm.ainee_web import CornellNote, thank_note_structured_llm,cornell_notes_structured_llm, CornellNotePage, CornellNotesResultModel
from app.libs.llm.prompts import thank_you_note_prompt, cornell_notes_prompt, teacher_thank_you_note_prompt, flashcard_generation_prompt
import os
import time
import hashlib
from app.config import settings
from app.api.file.file import storage, upload_file_size_is_valid, upload_file_type_is_valid, DEFAULT_UPLOAD_PATH
from fastapi import status
from app.libs.doc_parser.index import DocParser
import aiofiles

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ainee_web", tags=["Ainee Web"])

T = TypeVar('T')

@retry_async(Exception, tries=2, delay=3, backoff=2)
async def invoke_llm_with_structured_output(prompt: str, output_type: Optional[T] = None) -> Any:
    """
    Invoke LLM with retry and parse the response as structured output.
    
    Args:
        prompt: The prompt to send to the LLM
        output_type: Optional Pydantic model type for response validation
    
    Returns:
        Parsed JSON response, optionally validated against output_type
    
    Raises:
        ValueError: If JSON parsing fails
        ValidationError: If output_type validation fails
    """
    try:
        # Call LLM
        res = await llm.ainvoke(prompt)
        
        # Extract and parse JSON from response
        json_str = extract_json(res.content)
        result = json.loads(json_str)
        
        # Validate against output type if provided
        if output_type is not None:
            return output_type(**result)
        
        return result
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
        raise ValueError(f"Invalid JSON response from LLM: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in LLM invocation: {str(e)}")
        raise

class SubtitleSegment(BaseModel):
    text: str = Field(..., description="The subtitle text")
    start: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")

class YouTubeTranscriptionRequest(BaseModel):
    url: str = Field(..., description="The YouTube video URL to get transcription for")

class YouTubeTranscriptionResponse(BaseModel):
    transcription: List[SubtitleSegment] = Field(..., description="The transcription segments")
    transcription_raw: List[SubtitleSegment] = Field(..., description="The transcription segments")
    markdownmap: str = Field(..., description="Markdownmap")

class ThankYouNoteRequest(BaseModel):
    interviewer_name: str = Field(..., description="Name of the interviewer")
    company_name: str = Field(..., description="Name of the company")
    position_applied_for: str = Field(..., description="Position you applied for")
    interview_type: str = Field(..., description="Type of interview (e.g., technical, behavioral)")
    tone: str = Field(..., description="Desired tone of the thank you note (e.g., professional, friendly)")
    specific_points_to_mention: str = Field(..., description="Specific points to include in the thank you note")
    your_name: str = Field(..., description="Your name")

class ThankYouNoteResponse(BaseModel):
    thank_you_note: str = Field(..., description="Generated thank you note")

class TeacherThankYouNoteRequest(BaseModel):
    from_whom: Optional[str] = Field(None, description="Who is this from? (e.g., Parent, Student, Class Group, School Administration)")
    teacher_name: Optional[str] = Field(None, description="Teacher's name (will be used in greeting, e.g., 'Dear Mrs. Smith,')")
    your_name: Optional[str] = Field(None, description="Your name (will be used in closing)")
    teacher_type: Optional[str] = Field(None, description="Type of teacher (e.g., Elementary School Teacher, Daycare Teacher)")
    qualities: Optional[str] = Field(None, description="Qualities appreciated in the teacher (e.g., Patience, Creativity, Dedication)")
    memory: Optional[str] = Field(None, description="Optional specific memory or achievement to mention")
    tone: Optional[str] = Field(None, description="Desired tone of the note (e.g., Heartfelt, Formal, Casual, Humorous, Inspirational)")
    length: Optional[str] = Field(None, description="Desired length of the note (Short, Medium, Detailed)")

class TeacherThankYouNoteResponse(BaseModel):
    thank_you_note: str = Field(..., description="Generated thank you note for teacher")

class FileUploadResponse(BaseModel):
    url: str = Field(..., description="URL of the uploaded file")
    file_name: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="Size of the file in bytes")
    parsed_content: Optional[dict] = Field(None, description="Parsed content from the document")

class CornellNote(BaseModel):
    """Cornell note structure for a single page"""
    title: Optional[str] = Field(None, description="Title of the notes")
    date: Optional[str] = Field(None, description="Date of the notes")
    notes: Optional[str] = Field(None, description="Main content/notes section")
    questions: Optional[List[str]] = Field(None, description="Questions/cues section")
    summary: Optional[str] = Field(None, description="Summary of the notes")

class CornellNotePage(BaseModel):
    """Page structure containing Cornell notes"""
    page: Optional[int] = Field(None, description="Page number")
    cornell_notes: Optional[CornellNote] = Field(None, description="Cornell notes for this page")

class CornellNotesResult(BaseModel):
    """Model for Cornell Notes generation result"""
    pages: List[CornellNotePage] = Field(description="List of pages with Cornell notes")

class Flashcard(BaseModel):
    front: str = Field(..., description="Question text on the front of the flashcard")
    back: str = Field(..., description="Answer text on the back of the flashcard")

class FlashcardMetadata(BaseModel):
    sourceType: str = Field(..., description="Type of source ('file' or 'text')")
    sourceName: str = Field(..., description="Name of source file or 'Text Input'")
    generationTime: str = Field(..., description="ISO timestamp of generation time")
    flashcardCount: int = Field(..., description="Number of flashcards generated")
    language: str = Field(..., description="Language of the flashcards")

class FlashcardGenerationResult(BaseModel):
    success: bool = Field(..., description="Whether the generation was successful")
    flashcards: Optional[List[Flashcard]] = Field(None, description="List of generated flashcards")
    metadata: Optional[FlashcardMetadata] = Field(None, description="Metadata about the generation")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    errorCode: Optional[str] = Field(None, description="Error code if generation failed")

class FlashcardGenerationRequest(BaseModel):
    input_content: str = Field(..., description="The content to generate flashcards from")
    flashcard_count: int = Field(..., description="Number of flashcards to generate")
    language: str = Field(..., description="Target language for the flashcards")
    other_requirements: Optional[str] = Field(None, description="Additional requirements or specifications")
    source_type: str = Field(..., description="Type of source ('file' or 'text')")
    source_name: str = Field(..., description="Name of source file or 'Text Input'")

@router.post(
    "/youtube/transcription",
    response_model=CommonResponse[Optional[YouTubeTranscriptionResponse]],
    summary="Get YouTube Video Transcription",
    description="Get transcription for a YouTube video by its URL",
)
async def get_youtube_transcription(request: YouTubeTranscriptionRequest):
    try:
        logger.info(f"Received ainee web transcription request for URL: {request.url}")

        # Validate URL
        if not validators.url(request.url):
            return failed("Invalid URL")
        
        # Parse YouTube URL
        is_youtube_url, youtube_id = YouTubeService.parse_youtube_url(request.url)
        if not is_youtube_url:
            logger.error(f"Failed to parse YouTube URL: {request.url}")
            return failed("Not a valid YouTube URL")
       
        # Get transcription
        transcription = await YouTubeService().get_caption(youtube_id)
        if not transcription:
            return failed("Failed to get transcription")
        
        # Convert transcription to SubtitleSegment format
        segments = [
            SubtitleSegment(
                text=segment['text'],
                start=segment['start'],
                duration=segment['duration']
            )
            for segment in transcription.get('transcript', [])
        ]

        # Convert SubtitleSegment objects to dictionaries
        segments_dict = [segment.dict() for segment in segments]
        merged_subtitles = merge_subtitles(segments_dict)
        formatted_sub = format_subtitles(merged_subtitles)

        structure_res = await get_markdownmap(formatted_sub)
        
        return success(data=YouTubeTranscriptionResponse(
            transcription=merged_subtitles,
            transcription_raw=segments_dict,
            markdownmap=structure_res
        ))
        
    except Exception as e:
        logger.error(f"Failed to get YouTube transcription: {str(e)}, and URL: {request.url}")
        return failed("Failed to get transcription")

@router.post(
    "/thank-you-note",
    response_model=CommonResponse[Optional[ThankYouNoteResponse]],
    summary="Generate Thank You Note",
    description="Generate a personalized thank you note for an interview",
)
async def generate_thank_you_note(request: ThankYouNoteRequest):
    try:
        logger.info(f"Received thank you note generation request for {request.company_name} interview")
        
        # Create LangChain prompt template
        prompt = PromptTemplate(
            template=thank_you_note_prompt,
            input_variables=[
                "interviewer_name",
                "company_name",
                "position_applied_for",
                "interview_type",
                "tone",
                "specific_points_to_mention",
                "your_name"
            ]
        )
        
        # Format the prompt with the request data
        formatted_prompt = prompt.format(
            interviewer_name=request.interviewer_name,
            company_name=request.company_name,
            position_applied_for=request.position_applied_for,
            interview_type=request.interview_type,
            tone=request.tone,
            specific_points_to_mention=request.specific_points_to_mention,
            your_name=request.your_name
        )
        
        # Generate the thank you note
        res = await llm.ainvoke(formatted_prompt)

        thank_you_note = res.content
        
        return success(data=ThankYouNoteResponse(thank_you_note=thank_you_note))
        
    except Exception as e:
        logger.error(f"Failed to generate thank you note: {str(e)}")
        return failed("Failed to generate thank you note")

@router.post(
    "/thank-you-note-to-teacher",
    response_model=CommonResponse[TeacherThankYouNoteResponse],
    summary="Generate Thank You Note for Teacher",
    description="Generate a personalized thank you note for a teacher with customizable tone and length",
)
async def generate_teacher_thank_you_note(request: TeacherThankYouNoteRequest):
    try:
        logger.info(f"Received teacher thank you note generation request for teacher {request.teacher_name}")
        
        # Create LangChain prompt template
        prompt = PromptTemplate(
            template=teacher_thank_you_note_prompt,
            input_variables=[
                "from_whom",
                "teacher_name",
                "your_name",
                "teacher_type",
                "qualities",
                "memory",
                "tone",
                "length"
            ]
        )
        
        # Format the prompt with the request data
        formatted_prompt = prompt.format(
            from_whom=request.from_whom or "",
            teacher_name=request.teacher_name or "",
            your_name=request.your_name or "",
            teacher_type=request.teacher_type or "",
            qualities=request.qualities or "",
            memory=request.memory or "",
            tone=request.tone or "Heartfelt",  # Default to heartfelt tone if not specified
            length=request.length or "Medium"   # Default to medium length if not specified
        )
        
        # Generate the thank you note
        res = await llm.ainvoke(formatted_prompt)

        thank_you_note = res.content
        
        return success(data=TeacherThankYouNoteResponse(thank_you_note=thank_you_note))
        
    except Exception as e:
        logger.error(f"Failed to generate teacher thank you note: {str(e)}")
        return failed("Failed to generate teacher thank you note")

@router.post(
    "/flashcards/generate",
    response_model=CommonResponse[FlashcardGenerationResult],
    summary="Generate Educational Flashcards",
    description="Generate a set of educational flashcards from provided content with customizable parameters",
)
async def generate_flashcards(
    input_content: str = Form(None),
    flashcard_count: int = Form(...),
    language: str = Form(...),
    other_requirements: str = Form(None),
    source_type: str = Form(...),
    source_name: str = Form(...),
    file: UploadFile = File(None),
):
    try:
        logger.info(f"Received flashcard generation request for {source_name}")

        # 如果 source_type 为 file，处理文件内容
        if source_type == "file":
            if not file:
                return success(data=FlashcardGenerationResult(
                    success=False,
                    error="File is required when source_type is 'file'",
                    errorCode="FILE_REQUIRED"
                ))
            
            # 检查文件大小
            MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
            if file.size > MAX_FILE_SIZE:
                return success(data=FlashcardGenerationResult(
                    success=False,
                    error=f"File size is too large. Maximum allowed size is 50MB, got {file.size / (1024 * 1024):.2f}MB",
                    errorCode="FILE_SIZE_TOO_LARGE"
                ))
            # 检查文件类型
            allowed_file_types = {
                'application/pdf': '.pdf',
                'application/vnd.ms-powerpoint': '.ppt',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'text/markdown': '.md',
                'text/x-markdown': '.md',
                'text/plain': '.txt',
                'text/html': '.html',
                'application/xhtml+xml': '.xhtml'
            }
            file_ext = os.path.splitext(file.filename)[1].lower()
            valid_extension = False
            content_type = file.content_type
            if content_type in allowed_file_types:
                valid_extension = True
            else:
                for ext in allowed_file_types.values():
                    if file_ext == ext:
                        valid_extension = True
                        break
            if not valid_extension:
                allowed_extensions = list(set(allowed_file_types.values()))
                return success(data=FlashcardGenerationResult(
                    success=False,
                    error=f"File type not allowed. Allowed types: PDF, PowerPoint, Word, Excel, Markdown, TXT, HTML ({', '.join(allowed_extensions)})",
                    errorCode="FILE_TYPE_NOT_SUPPORTED"
                ))
            # 生成临时文件
            timestamp = int(time.time())
            file_hash = hashlib.md5(f"{timestamp}{file.filename}".encode()).hexdigest()[:8]
            new_file_name = f"{file_hash}-{file.filename}"
            file_content = await file.read()
            temp_file_path = f"/tmp/{new_file_name}"
            async with aiofiles.open(temp_file_path, 'wb') as temp_file_obj:
                await temp_file_obj.write(file_content)
            # 用 DocParser 解析
            try:
                doc_parser = DocParser()
                parsing_result = await doc_parser.parse(temp_file_path)
                input_content = parsing_result.markdown
            except Exception as parse_error:
                logger.error(f"Error parsing document: {str(parse_error)}")
                return success(data=FlashcardGenerationResult(
                    success=False,
                    error=f"Failed to parse document: {str(parse_error)}",
                    errorCode="PARSE_ERROR"
                ))
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
        else:
            # 文本输入校验
            if not input_content:
                return success(data=FlashcardGenerationResult(
                    success=False,
                    error="Input content is required when source_type is 'text'",
                    errorCode="CONTENT_REQUIRED"
                ))

        # Create LangChain prompt template
        prompt = PromptTemplate(
            template=flashcard_generation_prompt,
            input_variables=[
                "input_content",
                "flashcard_count",
                "language",
                "other_requirements",
                "source_type",
                "source_name"
            ]
        )
        # Format the prompt with the request data
        formatted_prompt = prompt.format(
            input_content=input_content,
            flashcard_count=flashcard_count,
            language=language,
            other_requirements=other_requirements or "",
            source_type=source_type,
            source_name=source_name
        )
        # Generate the flashcards with retry and structured output parsing
        try:
            result = await invoke_llm_with_structured_output(formatted_prompt, FlashcardGenerationResult)
            return success(data=result)
        except ValueError as e:
            logger.error(f"Failed to parse LLM response: {str(e)}")
            return success(data=FlashcardGenerationResult(
                success=False,
                error="Failed to parse generation result",
                errorCode="PARSE_ERROR"
            ))
    except Exception as e:
        logger.error(f"Failed to generate flashcards: {str(e)}")
        return success(data=FlashcardGenerationResult(
            success=False,
            error=f"Failed to generate flashcards: {str(e)}",
            errorCode="GENERATION_ERROR"
        ))

@router.post(
    "/cornell-notes/generate",
    response_model=CommonResponse[Optional[CornellNotesResult]],
    summary="Generate Cornell Notes from Document",
    description="Upload a document to generate Cornell-style notes. Configure note density and page division settings. Accepted file types: PDF, PowerPoint, Word, Excel, Markdown, TXT, HTML. Maximum file size: 50MB",
)
async def upload_file_with_params(
    file: UploadFile = File(..., description="The file to upload"),
    note_density: str = Form(..., description="First additional parameter"),
    page_division: str = Form(..., description="Second additional parameter"),
):
    try:
        logger.info(f"Received file upload request: {file.filename}, note_density: {note_density}, page_division: {page_division}")
        
        # Define max file size: 50MB
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
        
        # Check file size
        if file.size > MAX_FILE_SIZE:
            return failed(f"File size is too large. Maximum allowed size is 50MB, got {file.size / (1024 * 1024):.2f}MB")
        
        # Define allowed file types and extensions
        allowed_file_types = {
            # PDF
            'application/pdf': '.pdf',
            # PowerPoint
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            # Word
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            # Excel
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            # Markdown
            'text/markdown': '.md',
            'text/x-markdown': '.md',
            # TXT
            'text/plain': '.txt',
            # HTML
            'text/html': '.html',
            'application/xhtml+xml': '.xhtml'
        }
        
        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        valid_extension = False
        
        # Check content type
        content_type = file.content_type
        if content_type in allowed_file_types:
            valid_extension = True
        else:
            # Fallback to extension check if content_type is not recognized
            for ext in allowed_file_types.values():
                if file_ext == ext:
                    valid_extension = True
                    break
        
        if not valid_extension:
            allowed_extensions = list(set(allowed_file_types.values()))
            return failed(f"File type not allowed. Allowed types: PDF, PowerPoint, Word, Excel, Markdown, TXT, HTML ({', '.join(allowed_extensions)})")
        
        # Generate unique filename for temporary storage
        timestamp = int(time.time())
        file_hash = hashlib.md5(f"{timestamp}{file.filename}{note_density}{page_division}".encode()).hexdigest()[:8]
        new_file_name = f"{file_hash}-{file.filename}"
        
        # Read file content
        file_content = await file.read()
        
        # Create temporary file for DocParser
        temp_file_path = f"/tmp/{new_file_name}"
        async with aiofiles.open(temp_file_path, 'wb') as temp_file:
            await temp_file.write(file_content)
        
        # Process file with DocParser
        parsed_content = None
        try:
            doc_parser = DocParser()
            parsing_result = await doc_parser.parse(temp_file_path)
            parsed_content = parsing_result.markdown
        except Exception as parse_error:
            logger.error(f"Error parsing document: {str(parse_error)}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

        prompt = PromptTemplate(
            template=cornell_notes_prompt,
            input_variables=[
                "document_llm_data",
                "note_density",
                "page_division"
            ]
        )
        
        # Format the prompt with the request data
        formatted_prompt = prompt.format(
            document_llm_data=parsed_content,
            note_density=note_density,
            page_division=page_division
        )

        res = await llm.ainvoke(formatted_prompt)
        json_str = extract_json(res.content)
        
        # Parse JSON and convert to CornellNotesResult
        try:
            json_data = json.loads(json_str)
            # Convert the JSON data to CornellNotesResult
            pages = []
            for page in json_data:
                # Create CornellNote object first
                cornell_note = CornellNote(
                    title=page["cornell_notes"]["title"],
                    date=page["cornell_notes"]["date"],
                    notes=page["cornell_notes"]["notes"],
                    questions=page["cornell_notes"]["questions"],
                    summary=page["cornell_notes"]["summary"]
                )
                # Create CornellNotePage with the CornellNote object
                note_page = CornellNotePage(
                    page=page["page"],
                    cornell_notes=cornell_note
                )
                pages.append(note_page)
            
            result = CornellNotesResult(pages=pages)
            return success(data=result)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"Failed to parse LLM response: {str(e)}")
            return failed("Failed to parse LLM response")
        
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        return failed(f"Error: {str(e)}")
