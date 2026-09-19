"""Pydantic schemas for Tech Tutor for Seniors (Step h)."""

from typing import List, Optional
from pydantic import BaseModel, Field


class TutorialStep(BaseModel):
    step_number: int
    title: str
    description: str
    tip: Optional[str] = None
    icon: Optional[str] = "📱"
    warning: Optional[str] = None


class Tutorial(BaseModel):
    id: str
    title: str
    category: str  # e.g. "finance", "communication", "travel", "government"
    target_app: str  # e.g. "GPay / PhonePe", "WhatsApp", "IRCTC", "DigiLocker"
    difficulty: str = "Easy (आसान)"
    total_steps: int
    steps: List[TutorialStep]
    language: str = "hi"


class TutorAskHelpRequest(BaseModel):
    tutorial_id: str
    step_number: int
    question: str = Field(..., min_length=2)


class TutorAskHelpResponse(BaseModel):
    answer: str
    reassuring_note: str


class TutorCustomGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Topic or digital task senior wants to learn")
    language: str = "hi"
