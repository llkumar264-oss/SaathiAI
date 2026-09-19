"""Morning Brief Unit Tests (Step f).

Covers:
- Daily proactive brief generation
- Open-Meteo weather integration with temperature and senior advice
- Today's medicines integration
- Missed dose follow-up alert (Connected Workflow 1)
- Once-per-day caching behavior
- Refresh endpoint
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app


@pytest.fixture
def client():
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True, GEMINI_MOCK=True)
    reset_settings_for_tests(settings)
    app = create_app()
    return TestClient(app)


def test_morning_brief_generation_and_caching(client):
    """Test full morning brief generation with weather, tips, and caching."""
    # Use guest user who has pre-seeded missed doses and medicines
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch Morning Brief
    res1 = client.get("/api/morning-brief", headers=headers)
    assert res1.status_code == 200
    brief1 = res1.json()

    assert "Guest Senior" in brief1["greeting"] or "Sharma Ji" in brief1["greeting"]

    # Weather from Open-Meteo
    weather = brief1["weather"]
    assert "temperature_celsius" in weather
    assert "condition" in weather
    assert "senior_advice" in weather

    # Today's medicines
    meds = brief1["today_meds"]
    assert len(meds) == 3
    assert any("Amlodipine" in m["name"] for m in meds)

    # Missed doses follow-up (Connected Workflow 1)
    missed = brief1["missed_doses"]
    assert len(missed) > 0
    assert any("Metformin" in m for m in missed)

    # Tips
    assert "wellness_tip" in brief1
    assert "safety_tip" in brief1
    assert len(brief1["wellness_tip"]) > 10
    assert len(brief1["safety_tip"]) > 10

    # 2. Test Caching: Second call should return identical generated_at
    res2 = client.get("/api/morning-brief", headers=headers)
    assert res2.status_code == 200
    brief2 = res2.json()
    assert brief1["generated_at"] == brief2["generated_at"]

    # 3. Test Refresh
    ref_res = client.post("/api/morning-brief/refresh", headers=headers)
    assert ref_res.status_code == 200
    ref_brief = ref_res.json()
    assert "greeting" in ref_brief
