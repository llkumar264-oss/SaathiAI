"""Guest demo mode routes."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.schemas.user import UserSession
from backend.app.services.guest_service import (
    generate_guest_seed_data,
    get_guest_session_data,
    reset_guest_session,
)

router = APIRouter(prefix="/api/guest", tags=["Guest Demo"])


class GuestStartResponse(BaseModel):
    guest_id: str
    token: str
    display_name: str
    data: dict


@router.post("/start", response_model=GuestStartResponse)
async def start_guest_session(settings: Settings = Depends(get_settings)):
    """Initialize a guest demo session pre-loaded with sample medicines, vitals, scams, and bill."""
    # Create isolated guest session id
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    token = f"guest-{guest_id}"
    seed_data = generate_guest_seed_data(guest_id)

    return GuestStartResponse(
        guest_id=guest_id,
        token=token,
        display_name="Sharma Ji (अतिथि)",
        data=seed_data,
    )


@router.get("/data")
async def get_current_guest_data(
    current_user: UserSession = Depends(get_current_user),
):
    """Fetch current state of guest session data."""
    if not current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not in guest mode",
        )
    return get_guest_session_data(current_user.uid)


@router.post("/reset")
async def reset_current_guest_data(
    current_user: UserSession = Depends(get_current_user),
):
    """Reset guest session back to initial seeded state."""
    if not current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not in guest mode",
        )
    return reset_guest_session(current_user.uid)
