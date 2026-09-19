"""Pydantic schemas for Document Simplifier."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ImportantNumberItem(BaseModel):
    label: str = Field(..., description="Name of the number or amount, e.g. 'Consumer CA Number', 'Total Amount Due'")
    value: str = Field(..., description="The value, e.g. '102938475', '₹1,840'")


class DeadlineItem(BaseModel):
    title: str = Field(..., description="What the deadline is for, e.g. 'Bill Payment Due Date'")
    due_date: str = Field(..., description="Date formatted as YYYY-MM-DD or clear string")
    converted_to_reminder: bool = Field(default=False)


class DocumentSections(BaseModel):
    summary: str = Field(..., description="Clear, plain Hindi/English 2-3 sentence overview of the document")
    important_numbers: List[ImportantNumberItem] = Field(default_factory=list, description="All key monetary amounts and account/consumer numbers")
    deadlines: List[DeadlineItem] = Field(default_factory=list, description="Due dates, expiry dates, or hearing dates")
    next_steps: List[str] = Field(default_factory=list, description="Actionable, senior-friendly instructions on what to do next")


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    title: str
    doc_type: str = "general_document"
    uploaded_at: str
    sections: DocumentSections


class DeadlineReminderRequest(BaseModel):
    deadline_title: str
    due_date: str


class DocumentQARequest(BaseModel):
    question: str = Field(..., description="Senior's follow-up question about the document")


class DocumentQAResponse(BaseModel):
    answer: str
    grounded_in_doc: bool = True
