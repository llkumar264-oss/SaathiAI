"""Medicine and Prescription Extraction Tests (Step c).

Covers:
- Adding medicines manually
- Multimodal prescription extraction with Gemini Vision mock fixture
- Magic bytes validation & rejection of non-image uploads
- Dose logging (taken/skipped)
- 7-day adherence calculations
"""

import io
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


def test_add_and_get_medicines(client):
    """Test manual medicine creation and retrieval."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    # Add Medicine
    new_med = {
        "name": "Telmisartan",
        "dosage": "40mg",
        "frequency": "Once daily - Morning",
        "timing": "08:00",
        "purpose": "Blood Pressure control",
        "instructions": "Take with warm water",
    }
    create_res = client.post("/api/medicines", headers=headers, json=new_med)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == "Telmisartan"
    assert "id" in created_data

    # List Medicines
    list_res = client.get("/api/medicines", headers=headers)
    assert list_res.status_code == 200
    meds = list_res.json()
    assert any(m["id"] == created_data["id"] for m in meds)


def test_extract_prescription_with_valid_image(client):
    """Test prescription extraction endpoint with valid JPEG magic bytes."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    # Construct minimal valid JPEG bytes: FF D8 FF E0
    fake_jpeg_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C"
    files = {"file": ("rx.jpg", io.BytesIO(fake_jpeg_bytes), "image/jpeg")}

    res = client.post("/api/medicines/extract-prescription", headers=headers, files=files)
    assert res.status_code == 200
    body = res.json()
    assert "medicines" in body
    assert len(body["medicines"]) >= 2
    med_names = [m["name"] for m in body["medicines"]]
    assert any("Amlodipine" in name for name in med_names)


def test_extract_prescription_rejects_invalid_file(client):
    """File upload must reject fake extensions with invalid magic bytes."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    # Send plain text with .jpg extension
    invalid_bytes = b"This is not a real JPEG image file content"
    files = {"file": ("prescription.jpg", io.BytesIO(invalid_bytes), "image/jpeg")}

    res = client.post("/api/medicines/extract-prescription", headers=headers, files=files)
    assert res.status_code == 400
    assert "Invalid file format" in res.json()["detail"]


def test_log_dose_and_adherence(client):
    """Connected Workflow 1: Dose logging updates adherence calculation."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    # 1. Create a medicine
    new_med = {
        "name": "Glimepiride",
        "dosage": "1mg",
        "frequency": "Once daily before breakfast",
        "timing": "08:15",
        "purpose": "Diabetes control",
    }
    med_id = client.post("/api/medicines", headers=headers, json=new_med).json()["id"]

    # 2. Log 2 doses taken, 1 skipped
    client.post(
        f"/api/medicines/{med_id}/log",
        headers=headers,
        json={"status": "taken", "scheduled_time": "08:15"},
    )
    client.post(
        f"/api/medicines/{med_id}/log",
        headers=headers,
        json={"status": "taken", "scheduled_time": "08:15"},
    )
    client.post(
        f"/api/medicines/{med_id}/log",
        headers=headers,
        json={"status": "skipped", "scheduled_time": "08:15", "reason_skipped": "Traveling"},
    )

    # 3. Check adherence
    adh_res = client.get("/api/medicines/adherence", headers=headers)
    assert adh_res.status_code == 200
    adh = adh_res.json()
    assert adh["total_scheduled"] >= 3
    assert adh["total_taken"] >= 2
    assert adh["total_skipped"] >= 1
    assert 60.0 <= adh["overall_adherence_percent"] <= 75.0
    assert "Glimepiride" in adh["missed_medicines"]
