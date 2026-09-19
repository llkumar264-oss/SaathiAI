"""Document Simplifier API routes."""

from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.security.sanitizer import validate_file_upload
from backend.app.schemas.user import UserSession
from backend.app.schemas.document import (
    DeadlineReminderRequest,
    DocumentQARequest,
    DocumentQAResponse,
    DocumentResponse,
)
from backend.app.services.document_service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["Document Simplifier"])
_doc_service = DocumentService()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Upload a bill, pension letter, or government form to simplify into 4 sections."""
    content = await file.read()
    is_valid, mime_type, err = validate_file_upload(file.filename or "document.jpg", content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    try:
        doc_res = await _doc_service.simplify_document_file(
            file_bytes=content,
            filename=file.filename or "बिजली बिल / सरकारी पत्र",
            mime_type=mime_type,
            user_id=current_user.uid,
            is_guest=current_user.is_guest,
        )
        return doc_res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document simplification failed: {str(e)}",
        )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_user: UserSession = Depends(get_current_user),
):
    """List all simplified documents for the current senior user."""
    return _doc_service.get_documents(current_user.uid, current_user.is_guest)


@router.post("/{document_id}/remind-deadline")
async def create_deadline_reminder(
    document_id: str,
    req: DeadlineReminderRequest,
    current_user: UserSession = Depends(get_current_user),
):
    """1-tap convert a due date or deadline into an active reminder."""
    return _doc_service.convert_deadline_to_reminder(
        document_id=document_id,
        deadline_title=req.deadline_title,
        due_date=req.due_date,
        user_id=current_user.uid,
        is_guest=current_user.is_guest,
    )


@router.post("/{document_id}/ask", response_model=DocumentQAResponse)
async def ask_document_question(
    document_id: str,
    req: DocumentQARequest,
    current_user: UserSession = Depends(get_current_user),
):
    """Ask a follow-up question grounded strictly in this document."""
    return await _doc_service.answer_followup_question(
        document_id=document_id,
        question=req.question,
        user_id=current_user.uid,
        is_guest=current_user.is_guest,
    )
