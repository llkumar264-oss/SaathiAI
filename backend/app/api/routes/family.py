"""FastAPI routes for Family Circle & Emergency SOS (Step i)."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.schemas.family import (
    CaregiverDashboardView,
    SOSEvent,
    SOSEventCreate,
    TrustedContact,
    TrustedContactCreate,
)
from backend.app.schemas.user import UserSession
from backend.app.security.auth import get_current_user
from backend.app.services.family_service import (
    add_trusted_contact,
    delete_trusted_contact,
    get_caregiver_dashboard_view,
    get_trusted_contacts,
    trigger_emergency_sos,
)

logger = logging.getLogger("saathi.api.family")
router = APIRouter(prefix="/api/family", tags=["family"])


@router.get("/contacts", response_model=List[TrustedContact])
def list_contacts(
    current_user: UserSession = Depends(get_current_user),
) -> List[TrustedContact]:
    """List registered trusted family members and emergency contacts."""
    return get_trusted_contacts(current_user.uid, is_guest=current_user.is_guest)


@router.post("/contacts", response_model=TrustedContact, status_code=status.HTTP_201_CREATED)
def create_contact(
    req: TrustedContactCreate,
    current_user: UserSession = Depends(get_current_user),
) -> TrustedContact:
    """Add a new trusted family contact."""
    return add_trusted_contact(current_user.uid, req, is_guest=current_user.is_guest)


@router.delete("/contacts/{contact_id}")
def remove_contact(
    contact_id: str,
    current_user: UserSession = Depends(get_current_user),
) -> Dict[str, Any]:
    """Remove a contact from the trusted circle."""
    success = delete_trusted_contact(current_user.uid, contact_id, is_guest=current_user.is_guest)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID '{contact_id}' not found.",
        )
    return {"success": True, "message": "संपर्क सफलतापूर्वक हटा दिया गया।"}


@router.post("/sos", response_model=SOSEvent)
def emergency_sos(
    req: SOSEventCreate,
    current_user: UserSession = Depends(get_current_user),
) -> SOSEvent:
    """Trigger emergency SOS alert: logs location, notifies family circle, links to 112."""
    return trigger_emergency_sos(
        user_id=current_user.uid,
        display_name=current_user.display_name,
        req=req,
        is_guest=current_user.is_guest,
    )


@router.get("/caregiver-view", response_model=CaregiverDashboardView)
def caregiver_view(
    current_user: UserSession = Depends(get_current_user),
) -> CaregiverDashboardView:
    """Read-only consent view for family members/caregivers showing health & safety status."""
    return get_caregiver_dashboard_view(
        user_id=current_user.uid,
        display_name=current_user.display_name,
        is_guest=current_user.is_guest,
    )
