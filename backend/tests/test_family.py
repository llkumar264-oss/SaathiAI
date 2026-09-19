"""Family Circle & Emergency SOS Unit Tests (Step i).

Covers:
- Trusted contacts listing, adding, and deletion
- Emergency SOS trigger with geolocation and Google Maps URL
- Cross-module Caregiver Dashboard view
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


def test_list_default_contacts(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/family/contacts", headers=headers)
    assert res.status_code == 200
    contacts = res.json()
    assert len(contacts) >= 3

    names = [c["name"] for c in contacts]
    assert any("Amit" in n for n in names)
    assert any("Priya" in n for n in names)
    assert any("Gupta" in n for n in names)


def test_add_and_delete_contact(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Add new contact
    add_res = client.post(
        "/api/family/contacts",
        headers=headers,
        json={
            "name": "Ramesh Kumar (पड़ोसी / Neighbor)",
            "relationship": "Neighbor",
            "phone_number": "+91 9988776655",
            "is_primary": False,
            "notify_on_sos": True,
        },
    )
    assert add_res.status_code == 201
    new_contact = add_res.json()
    assert "id" in new_contact
    contact_id = new_contact["id"]

    # Verify present in list
    list_res = client.get("/api/family/contacts", headers=headers)
    ids = [c["id"] for c in list_res.json()]
    assert contact_id in ids

    # 2. Delete contact
    del_res = client.delete(f"/api/family/contacts/{contact_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    list_res2 = client.get("/api/family/contacts", headers=headers)
    ids2 = [c["id"] for c in list_res2.json()]
    assert contact_id not in ids2


def test_emergency_sos_with_location(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    sos_res = client.post(
        "/api/family/sos",
        headers=headers,
        json={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "accuracy_meters": 12.5,
            "address_hint": "Near Connaught Place, New Delhi",
        },
    )
    assert sos_res.status_code == 200
    sos_data = sos_res.json()
    assert sos_data["status"] == "active"
    assert sos_data["latitude"] == 28.6139
    assert sos_data["longitude"] == 77.2090
    assert "https://www.google.com/maps?q=28.6139,77.209" in sos_data["maps_url"]
    assert len(sos_data["contacts_alerted"]) >= 2
    assert any("Amit" in c for c in sos_data["contacts_alerted"])


def test_caregiver_dashboard_view(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger an SOS first to ensure it shows in caregiver view
    client.post(
        "/api/family/sos",
        headers=headers,
        json={"latitude": 28.5355, "longitude": 77.3910},
    )

    res = client.get("/api/family/caregiver-view", headers=headers)
    assert res.status_code == 200
    view = res.json()

    assert "senior_name" in view
    assert "adherence_rate_7d" in view
    assert "today_doses_summary" in view
    assert "latest_vitals" in view
    assert "recent_scam_alerts" in view
    assert view["last_sos"] is not None
    assert view["last_sos"]["latitude"] == 28.5355
