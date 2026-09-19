"""FastAPI routes for Tech Tutor (Step h)."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.schemas.tutor import (
    Tutorial,
    TutorAskHelpRequest,
    TutorAskHelpResponse,
    TutorCustomGenerateRequest,
)
from backend.app.schemas.user import UserSession
from backend.app.security.auth import get_current_user
from backend.app.services.tutor_service import (
    generate_custom_tutorial,
    get_stuck_help,
    get_tutorial,
    list_tutorials,
)

logger = logging.getLogger("saathi.api.tutor")
router = APIRouter(prefix="/api/tutor", tags=["tutor"])


@router.get("/tutorials", response_model=List[Dict[str, Any]])
def get_tutorials_list(
    current_user: UserSession = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Retrieve catalog of curated step-by-step tech guides for seniors."""
    return list_tutorials()


@router.get("/tutorials/{tutorial_id}", response_model=Tutorial)
def get_tutorial_detail(
    tutorial_id: str,
    current_user: UserSession = Depends(get_current_user),
) -> Tutorial:
    """Retrieve complete step-by-step tutorial."""
    tut = get_tutorial(tutorial_id)
    if not tut:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tutorial with ID '{tutorial_id}' not found.",
        )
    return tut


@router.post("/ask-help", response_model=TutorAskHelpResponse)
async def ask_stuck_help(
    req: TutorAskHelpRequest,
    current_user: UserSession = Depends(get_current_user),
) -> TutorAskHelpResponse:
    """Ask Saathi for compassionate, immediate assistance when stuck on a step."""
    return await get_stuck_help(
        tutorial_id=req.tutorial_id,
        step_number=req.step_number,
        question=req.question,
    )


@router.post("/generate", response_model=Tutorial)
async def generate_tutorial(
    req: TutorCustomGenerateRequest,
    current_user: UserSession = Depends(get_current_user),
) -> Tutorial:
    """Dynamically generate a patient, step-by-step guide for any digital task."""
    return await generate_custom_tutorial(topic=req.topic, language=req.language)
