"""Auth status and user profile routes."""

from fastapi import APIRouter, Depends
from backend.app.security.auth import get_current_user
from backend.app.schemas.user import UserSession

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/me", response_model=UserSession)
async def get_authenticated_user(
    current_user: UserSession = Depends(get_current_user),
):
    """Return currently authenticated senior user session."""
    return current_user
