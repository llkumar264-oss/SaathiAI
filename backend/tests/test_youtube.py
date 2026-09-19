"""Unit tests for YouTube & Devotional Bhajan service and endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.services.youtube_service import (
    CURATED_BHAJANS,
    get_curated_catalog,
    search_youtube_videos,
)


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_get_curated_catalog_returns_items():
    """Verify curated spiritual catalog contains verified bhajans and handles categories."""
    all_items = get_curated_catalog()
    assert len(all_items) >= 6
    assert any("हनुमान चालीसा" in item["title"] for item in all_items)
    assert any("गायत्री मंत्र" in item["title"] for item in all_items)

    hanuman_items = get_curated_catalog("hanuman")
    assert len(hanuman_items) >= 1
    assert all(item["category"] == "hanuman" for item in hanuman_items)


@pytest.mark.asyncio
async def test_search_youtube_videos_fallback_and_api():
    """Verify search returns matches from curated catalog or fallback."""
    # Curated match
    results = await search_youtube_videos("हनुमान")
    assert len(results) >= 1
    assert "हनुमान" in results[0]["title"]

    # Unknown query returns senior-friendly fallback video card
    unknown_results = await search_youtube_videos("अनजान संगीत")
    assert len(unknown_results) >= 1
    assert "अनजान संगीत" in unknown_results[0]["title"]

    # With mocked YouTube Data API key
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "items": [
            {
                "id": {"videoId": "test_vid_123"},
                "snippet": {
                    "title": "श्री राम भजन Live",
                    "channelTitle": "T-Series Bhakti Sagar",
                    "description": "पावन भजन",
                    "thumbnails": {"high": {"url": "https://img.youtube.com/vi/test_vid_123/hqdefault.jpg"}},
                },
            }
        ]
    }

    with patch("backend.app.services.youtube_service.get_settings") as mock_settings:
        mock_settings.return_value.YOUTUBE_API_KEY = "mock_yt_key_123"
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_res
            api_results = await search_youtube_videos("राम भजन")
            assert len(api_results) == 1
            assert api_results[0]["id"] == "test_vid_123"
            assert api_results[0]["singer"] == "T-Series Bhakti Sagar"


def test_youtube_api_endpoints(client):
    """Test /api/youtube/curated, /search, and /play endpoints."""
    # 1. Curated list
    res = client.get("/api/youtube/curated")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 6

    # 2. Search
    res_search = client.get("/api/youtube/search?q=गायत्री")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data) >= 1
    assert "गायत्री" in search_data[0]["title"]

    # 3. Play
    res_play = client.post("/api/youtube/play", json={"video_id": "AETFvQonfV8", "title": "हनुमान चालीसा"})
    assert res_play.status_code == 200
    play_data = res_play.json()
    assert play_data["status"] == "ready"
    assert "AETFvQonfV8" in play_data["embed_url"]
