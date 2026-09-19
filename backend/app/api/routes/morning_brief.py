"""Morning Brief API routes."""

from fastapi import APIRouter, Depends
from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.schemas.user import UserSession
from backend.app.services.morning_brief_service import MorningBriefService

router = APIRouter(prefix="/api/morning-brief", tags=["Morning Brief"])
_brief_service = MorningBriefService()


@router.get("")
async def get_daily_morning_brief(
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Retrieve today's cached or fresh personalized morning brief."""
    return await _brief_service.get_or_generate_brief(
        user_id=current_user.uid,
        display_name=current_user.display_name,
        is_guest=current_user.is_guest,
        force_refresh=False,
    )


@router.post("/refresh")
async def refresh_daily_morning_brief(
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Force re-generation of today's morning brief."""
    return await _brief_service.get_or_generate_brief(
        user_id=current_user.uid,
        display_name=current_user.display_name,
        is_guest=current_user.is_guest,
        force_refresh=True,
    )
