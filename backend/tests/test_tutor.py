"""Tech Tutor Unit Tests (Step h).

Covers:
- Curated catalog listing
- Step-by-step tutorial retrieval with safety warnings
- Contextual 'stuck help' for seniors
- Dynamic tutorial generation via Gemini
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


def test_list_tutorials(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/tutor/tutorials", headers=headers)
    assert res.status_code == 200
    catalog = res.json()
    assert len(catalog) >= 5

    ids = [t["id"] for t in catalog]
    assert "upi_payment" in ids
    assert "whatsapp_video" in ids
    assert "utility_bill" in ids
    assert "digilocker_aadhaar" in ids
    assert "google_maps" in ids


def test_get_tutorial_detail_with_safety_warning(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/tutor/tutorials/upi_payment", headers=headers)
    assert res.status_code == 200
    tut = res.json()

    assert tut["id"] == "upi_payment"
    assert tut["total_steps"] == 5
    assert len(tut["steps"]) == 5

    # Critical Senior Safety Check: UPI guide must have safety warning
    last_step = tut["steps"][-1]
    assert last_step["warning"] is not None
    assert "UPI PIN" in last_step["warning"]


def test_get_nonexistent_tutorial_returns_404(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/tutor/tutorials/non_existent_guide", headers=headers)
    assert res.status_code == 404


def test_ask_stuck_help(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/tutor/ask-help",
        headers=headers,
        json={
            "tutorial_id": "upi_payment",
            "step_number": 2,
            "question": "मुझे स्क्रीन पर स्कैनर का निशान नहीं मिल रहा है",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "reassuring_note" in data
    assert len(data["answer"]) > 10


def test_generate_custom_tutorial(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/tutor/generate",
        headers=headers,
        json={"topic": "DMRC Metro Smart Card Recharge", "language": "hi"},
    )
    assert res.status_code == 200
    custom_tut = res.json()
    assert "steps" in custom_tut
    assert len(custom_tut["steps"]) >= 3
    assert "Metro" in custom_tut["title"] or "मार्गदर्शक" in custom_tut["title"]
