"""Scam Shield API routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.schemas.user import UserSession
from backend.app.services.scam_service import ScamService

router = APIRouter(prefix="/api/scam", tags=["Scam Shield"])
_scam_service = ScamService()


class ScamCheckRequest(BaseModel):
    message_text: str = Field(..., min_length=2, max_length=2000, description="SMS, WhatsApp, or suspicious link text")


class AlertFamilyRequest(BaseModel):
    log_id: str = Field(..., description="ID of the scam log record")


@router.post("/check")
async def check_scam_message(
    req: ScamCheckRequest,
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Analyze a suspicious message with the trained ML model and Gemini explanation."""
    result = await _scam_service.check_message(
        text=req.message_text,
        user_id=current_user.uid,
        is_guest=current_user.is_guest,
    )
    return result


@router.post("/alert-family")
async def alert_family_scam(
    req: AlertFamilyRequest,
    current_user: UserSession = Depends(get_current_user),
):
    """1-tap alert sending scam warning to trusted family circle."""
    return _scam_service.alert_family(
        log_id=req.log_id,
        user_id=current_user.uid,
        is_guest=current_user.is_guest,
    )


@router.get("/history")
async def get_scam_history(
    current_user: UserSession = Depends(get_current_user),
):
    """Fetch safety check history for current user."""
    return _scam_service.get_history(
        user_id=current_user.uid,
        is_guest=current_user.is_guest,
    )
