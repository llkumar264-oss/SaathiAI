"""FastAPI routes for Health & Vitals Management (Step g)."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.schemas.user import UserSession
from backend.app.schemas.vital import (
    VitalCreateRequest,
    VitalEntry,
    VitalsSummary,
    VoiceVitalParseRequest,
)
from backend.app.security.auth import get_current_user
from backend.app.services.vital_service import (
    detect_anomalies_with_ml,
    get_user_vitals,
    get_vitals_summary,
    parse_voice_vitals,
    record_vital_reading,
)

logger = logging.getLogger("saathi.api.vitals")
router = APIRouter(prefix="/api/vitals", tags=["vitals"])


@router.get("", response_model=List[VitalEntry])
def list_vitals(
    current_user: UserSession = Depends(get_current_user),
) -> List[VitalEntry]:
    """Retrieve historical health vitals with ML anomaly scores."""
    raw_vitals = get_user_vitals(current_user.uid, is_guest=current_user.is_guest)
    analyzed = detect_anomalies_with_ml(raw_vitals)
    return [VitalEntry(**item) for item in analyzed]


@router.post("", response_model=VitalEntry, status_code=status.HTTP_201_CREATED)
def create_vital(
    req: VitalCreateRequest,
    current_user: UserSession = Depends(get_current_user),
) -> VitalEntry:
    """Record a new vitals reading, classify 4-tier health status, and run anomaly check."""
    if req.systolic is None and req.diastolic is None and req.blood_sugar is None and req.pulse is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one vital sign (BP, sugar, or pulse) must be provided.",
        )

    entry = record_vital_reading(current_user.uid, req, is_guest=current_user.is_guest)
    return VitalEntry(**entry)


@router.post("/parse-voice", response_model=Dict[str, Any])
def parse_voice_reading(
    req: VoiceVitalParseRequest,
    current_user: UserSession = Depends(get_current_user),
) -> Dict[str, Any]:
    """Parse spoken vitals input in Hindi, English, or Hinglish into structured fields."""
    parsed = parse_voice_vitals(req.voice_text)
    return parsed


@router.get("/summary", response_model=VitalsSummary)
def vitals_summary(
    current_user: UserSession = Depends(get_current_user),
) -> VitalsSummary:
    """Get aggregated vitals stats, personal averages, and anomaly alerts."""
    return get_vitals_summary(current_user.uid, is_guest=current_user.is_guest)
