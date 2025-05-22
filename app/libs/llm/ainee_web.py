from pydantic import Field, BaseModel
from typing import List, Optional

from app.libs.llm.llm_clients import llm


class ThanksNoteResultModel(BaseModel):
    """
    Summary label model
    """
    thanks_note: str = Field(description="The thanks note.", example="Thanks for your help!")


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


class CornellNotesResultModel(BaseModel):
    """Model for Cornell Notes generation result"""
    pages: List[CornellNotePage] = Field(description="List of pages with Cornell notes")


thank_note_structured_llm = llm.with_structured_output(ThanksNoteResultModel)
cornell_notes_structured_llm = llm.with_structured_output(CornellNotesResultModel)
