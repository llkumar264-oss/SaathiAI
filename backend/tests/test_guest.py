"""Guest Demo Mode Tests.

Verifies:
- 3 medicines with 7 days of dose history
- 20 vitals readings (including 2 anomalies: 1 urgent BP, 1 high sugar)
- 3 scam check history records
- 1 sample electricity bill document
- Session isolation and reset
"""

from fastapi.testclient import TestClient

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app


def test_guest_session_initialization():
    """Verify guest start returns all required seeded modules and counts."""
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True)
    reset_settings_for_tests(settings)
    app = create_app()
    client = TestClient(app)

    # 1. Start guest session
    res = client.post("/api/guest/start")
    assert res.status_code == 200
    body = res.json()

    assert "guest_id" in body
    assert "token" in body
    assert body["token"].startswith("guest-")

    data = body["data"]

    # Acceptance Criteria 1: Exactly 3 medicines
    medicines = data.get("medicines", [])
    assert len(medicines) == 3
    med_names = [m["name"] for m in medicines]
    assert any("Amlodipine" in n for n in med_names)
    assert any("Metformin" in n for n in med_names)
    assert any("Atorvastatin" in n for n in med_names)

    # Dose history for past 7 days across 3 medicines (at least 21 scheduled entries)
    dose_history = data.get("dose_history", [])
    assert len(dose_history) >= 21
    # Check that at least one dose is marked skipped to simulate realistic senior routine
    statuses = {entry["status"] for entry in dose_history}
    assert "taken" in statuses
    assert "skipped" in statuses

    # Acceptance Criteria 2: Exactly 20 vitals readings with 2 anomalies
    vitals = data.get("vitals", [])
    assert len(vitals) == 20
    anomalies = [v for v in vitals if v.get("is_anomaly")]
    assert len(anomalies) == 2

    # Verify one anomaly is an Urgent tier BP (Systolic >= 180 or Diastolic >= 120)
    urgent_bps = [v for v in anomalies if v.get("systolic", 0) >= 180 or v.get("diastolic", 0) >= 120]
    assert len(urgent_bps) == 1
    assert urgent_bps[0]["tier"] == "Urgent"

    # Verify second anomaly is high sugar (> 200 mg/dL)
    high_sugars = [v for v in anomalies if v.get("blood_sugar", 0) > 200]
    assert len(high_sugars) == 1

    # Acceptance Criteria 3: Exactly 3 scam checks
    scams = data.get("scam_history", [])
    assert len(scams) == 3
    high_risk_scams = [s for s in scams if s.get("risk_score", 0) >= 90]
    safe_messages = [s for s in scams if s.get("risk_score", 0) <= 20]
    assert len(high_risk_scams) == 2
    assert len(safe_messages) == 1

    # Acceptance Criteria 4: Exactly 1 sample electricity bill document
    docs = data.get("documents", [])
    assert len(docs) == 1
    doc = docs[0]
    assert doc["doc_type"] == "electricity_bill"
    sections = doc["sections"]
    assert "summary" in sections
    assert "important_numbers" in sections
    assert "deadlines" in sections
    assert "next_steps" in sections


def test_guest_session_isolation_and_reset():
    """Verify that guest data can be queried and reset via guest token."""
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True)
    reset_settings_for_tests(settings)
    app = create_app()
    client = TestClient(app)

    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Fetch guest data
    get_res = client.get("/api/guest/data", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()["medicines"]) == 3

    # Reset guest data
    reset_res = client.post("/api/guest/reset", headers=headers)
    assert reset_res.status_code == 200
    assert len(reset_res.json()["medicines"]) == 3
