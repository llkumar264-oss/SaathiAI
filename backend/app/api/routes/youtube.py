"""YouTube & Devotional Bhajan API Routes."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.app.services.youtube_service import (
    get_curated_catalog,
    search_youtube_videos,
)

router = APIRouter(prefix="/api/youtube", tags=["Bhajan & YouTube"])


class PlayVideoRequest(BaseModel):
    video_id: str
    title: Optional[str] = None


@router.get("/curated", response_model=List[Dict[str, Any]])
async def get_curated_bhajans(
    category: Optional[str] = Query(default=None, description="Category filter, e.g. hanuman, krishna, shiva, aarti_mantra, ram, geet"),
):
    """Retrieve verified devotional bhajans, aartis, and evergreen music for senior citizens."""
    return get_curated_catalog(category)


@router.get("/search", response_model=List[Dict[str, Any]])
async def search_bhajans(
    q: str = Query(..., description="Search query for bhajan, aarti, or YouTube video"),
    category: Optional[str] = Query(default=None, description="Optional category"),
):
    """Search for bhajans or music on YouTube."""
    return await search_youtube_videos(query=q, category=category)


@router.post("/play")
async def register_played_video(request: PlayVideoRequest):
    """Return embed player payload for requested video ID."""
    return {
        "status": "ready",
        "video_id": request.video_id,
        "title": request.title or "भजन चल रहा है",
        "embed_url": f"https://www.youtube-nocookie.com/embed/{request.video_id}?autoplay=1&rel=0&modestbranding=1",
    }
