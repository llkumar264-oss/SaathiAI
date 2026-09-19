"""Medicine and Prescription API routes."""

from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.security.sanitizer import validate_file_upload
from backend.app.schemas.user import UserSession
from backend.app.schemas.medicine import (
    AdherenceStats,
    DoseLogRequest,
    DoseLogResponse,
    MedicineCreate,
    MedicineResponse,
    PrescriptionExtractionResponse,
)
from backend.app.services.medicine_service import MedicineService

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])
_medicine_service = MedicineService()


@router.get("", response_model=List[MedicineResponse])
async def get_medicines(
    current_user: UserSession = Depends(get_current_user),
):
    """List all scheduled medicines for current user."""
    return _medicine_service.get_medicines(current_user.uid, current_user.is_guest)


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    med_in: MedicineCreate,
    current_user: UserSession = Depends(get_current_user),
):
    """Add a confirmed medicine to schedule."""
    return _medicine_service.add_medicine(current_user.uid, med_in, current_user.is_guest)


@router.post("/extract-prescription", response_model=PrescriptionExtractionResponse)
async def extract_prescription(
    file: UploadFile = File(...),
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Upload a prescription photo and extract medicines using Gemini Vision."""
    content = await file.read()
    is_valid, mime_type, err = validate_file_upload(file.filename or "prescription.jpg", content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    try:
        extraction = await _medicine_service.extract_prescription_from_image(
            image_bytes=content,
            mime_type=mime_type,
        )
        return extraction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Prescription extraction failed: {str(e)}",
        )


@router.post("/{medicine_id}/log", response_model=DoseLogResponse)
async def log_medicine_dose(
    medicine_id: str,
    log_req: DoseLogRequest,
    current_user: UserSession = Depends(get_current_user),
):
    """Mark dose as taken or skipped."""
    return _medicine_service.log_dose(
        user_id=current_user.uid,
        medicine_id=medicine_id,
        log_req=log_req,
        is_guest=current_user.is_guest,
    )


@router.get("/adherence", response_model=AdherenceStats)
async def get_adherence_statistics(
    days: int = 7,
    current_user: UserSession = Depends(get_current_user),
):
    """Get 7-day adherence percentage and missed medicine summary."""
    return _medicine_service.get_adherence_stats(
        user_id=current_user.uid,
        days=days,
        is_guest=current_user.is_guest,
    )
