"""Health check route."""

from fastapi import APIRouter, Depends
from backend.app.config import Settings, get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(settings: Settings = Depends(get_settings)):
    """Liveness probe for Cloud Run and monitoring."""
    return {
        "status": "healthy",
        "app": "SaathiAI",
        "environment": settings.ENVIRONMENT,
        "gemini_mock": settings.GEMINI_MOCK,
    }
