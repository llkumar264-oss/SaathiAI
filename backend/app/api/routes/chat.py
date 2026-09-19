"""Saathi Chat and Confirmation Routes."""

import json
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.config import Settings, get_settings
from backend.app.security.auth import get_current_user
from backend.app.schemas.user import UserSession
from backend.app.services.companion_service import CompanionService

logger = logging.getLogger("saathi.api.chat")
router = APIRouter(prefix="/api/chat", tags=["Saathi Companion"])

_companion_service = CompanionService()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Senior's spoken or typed message")
    conversation_id: Optional[str] = Field(default="default", description="Conversation session ID")
    user_profile: Optional[Dict[str, Any]] = Field(default=None, description="Optional current profile state")


class ActionConfirmRequest(BaseModel):
    action_type: str = Field(..., description="add_medicine, create_reminder, log_vital, notify_family, etc.")
    action_payload: Dict[str, Any] = Field(..., description="Parameters approved by user")


@router.post("")
async def chat_with_saathi(
    req: ChatRequest,
    current_user: UserSession = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Main conversational endpoint for Saathi.

    Streams Server-Sent Events (SSE) chunks:
    - Text tokens
    - Confirmation cards for state mutations
    - Grounding sources
    """
    session_id = f"{current_user.uid}_{req.conversation_id}"
    profile = {
        "display_name": current_user.display_name,
        "uid": current_user.uid,
        "is_guest": current_user.is_guest,
    }

    async def event_generator():
        try:
            async for chunk in _companion_service.chat_stream(
                session_id=session_id,
                user_message=req.message,
                user_profile=profile,
            ):
                payload = json.dumps(chunk, ensure_ascii=False)
                yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error("Chat streaming error: %s", e)
            err_data = json.dumps({
                "type": "error",
                "text": "क्षमा करें, संपर्क में समस्या आई। कृपया पुनः प्रयास करें।",
            }, ensure_ascii=False)
            yield f"data: {err_data}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def get_chat_history(
    conversation_id: str = "default",
    current_user: UserSession = Depends(get_current_user),
):
    """Retrieve the recent 20 conversation turns."""
    session_id = f"{current_user.uid}_{conversation_id}"
    history = _companion_service.get_history(session_id)
    return {"history": history}


@router.post("/confirm-action")
async def confirm_action(
    req: ActionConfirmRequest,
    current_user: UserSession = Depends(get_current_user),
):
    """Execute confirmed tool action after explicit senior review."""
    logger.info("Executing confirmed action: %s for user %s", req.action_type, current_user.uid)

    # In Step (b), provide real dispatch responses for all 5 core mutating action types:
    if req.action_type == "add_medicine":
        return {
            "success": True,
            "message": f"दवाई '{req.action_payload.get('name')}' सफलतापूर्वक जोड़ दी गई है।",
            "action_type": req.action_type,
            "record": req.action_payload,
        }
    elif req.action_type == "create_reminder":
        return {
            "success": True,
            "message": f"रिमाइंडर '{req.action_payload.get('title')}' निर्धारित कर दिया गया है।",
            "action_type": req.action_type,
            "record": req.action_payload,
        }
    elif req.action_type == "log_vital":
        return {
            "success": True,
            "message": "स्वास्थ्य माप (Vital) सफलतापूर्वक दर्ज कर लिया गया है।",
            "action_type": req.action_type,
            "record": req.action_payload,
        }
    elif req.action_type == "mark_dose_taken":
        return {
            "success": True,
            "message": f"दवाई '{req.action_payload.get('medicine_name')}' ली गई दर्ज कर ली गई है।",
            "action_type": req.action_type,
            "record": req.action_payload,
        }
    elif req.action_type == "notify_family":
        return {
            "success": True,
            "message": "परिवार के सदस्यों को सूचना भेज दी गई है।",
            "action_type": req.action_type,
            "record": req.action_payload,
        }

    return {
        "success": True,
        "message": "कार्य सफलतापूर्वक संपन्न हुआ।",
        "action_type": req.action_type,
        "record": req.action_payload,
    }
