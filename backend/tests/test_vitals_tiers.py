"""Unit tests for Health Vitals 4-Tier boundaries, JNC-8 targets, voice parsing, and ML Anomaly Detector (Step g).

Covers:
- Exact BP tier boundaries: Normal, Elevated, High, Urgent
- JNC-8 age 60+ targets (SBP < 150 mmHg and DBP < 90 mmHg)
- Exact Blood Glucose boundaries: Fasting vs Post-meal, and Urgent (<70 or >300)
- "contact a doctor now / call 112" urgent advisory string
- Voice vital parsing for Hindi/English/Hinglish
- IsolationForest ML Anomaly Detection on senior dataset
- API endpoints: list, create, parse-voice, summary
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app
from backend.app.schemas.vital import SugarContext, VitalTier
from backend.app.services.vital_service import (
    classify_bp_tier,
    classify_sugar_tier,
    evaluate_vital_record,
    parse_voice_vitals,
)


@pytest.fixture
def client():
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True, GEMINI_MOCK=True)
    reset_settings_for_tests(settings)
    app = create_app()
    return TestClient(app)


# =========================================================================
# 1. Blood Pressure Tier Boundary Unit Tests
# =========================================================================

def test_bp_tier_normal_boundary():
    # Systolic < 120 and Diastolic < 80
    tier, jnc8 = classify_bp_tier(119, 79)
    assert tier == VitalTier.NORMAL
    assert jnc8 is True

    tier2, jnc8_2 = classify_bp_tier(110, 70)
    assert tier2 == VitalTier.NORMAL
    assert jnc8_2 is True


def test_bp_tier_elevated_boundary():
    # Systolic 120-139 and Diastolic < 80
    tier1, jnc8_1 = classify_bp_tier(120, 79)
    assert tier1 == VitalTier.ELEVATED
    assert jnc8_1 is True

    tier2, jnc8_2 = classify_bp_tier(139, 79)
    assert tier2 == VitalTier.ELEVATED
    assert jnc8_2 is True

    # Diastolic 80-89 and Systolic < 140
    tier3, jnc8_3 = classify_bp_tier(118, 80)
    assert tier3 == VitalTier.ELEVATED
    assert jnc8_3 is True

    tier4, jnc8_4 = classify_bp_tier(135, 89)
    assert tier4 == VitalTier.ELEVATED
    assert jnc8_4 is True


def test_bp_tier_high_boundary_and_jnc8():
    # Systolic 140-179 or Diastolic 90-119
    # Within JNC-8 target (<150 and <90)
    tier1, jnc8_1 = classify_bp_tier(140, 85)
    assert tier1 == VitalTier.HIGH
    assert jnc8_1 is True

    tier2, jnc8_2 = classify_bp_tier(149, 89)
    assert tier2 == VitalTier.HIGH
    assert jnc8_2 is True

    # Outside JNC-8 target (>=150 or >=90)
    tier3, jnc8_3 = classify_bp_tier(150, 85)
    assert tier3 == VitalTier.HIGH
    assert jnc8_3 is False  # Fails SBP < 150

    tier4, jnc8_4 = classify_bp_tier(138, 90)
    assert tier4 == VitalTier.HIGH
    assert jnc8_4 is False  # Fails DBP < 90

    tier5, jnc8_5 = classify_bp_tier(179, 119)
    assert tier5 == VitalTier.HIGH
    assert jnc8_5 is False


def test_bp_tier_urgent_boundary():
    # Urgent: Systolic >= 180 or Diastolic >= 120
    tier1, jnc8_1 = classify_bp_tier(180, 85)
    assert tier1 == VitalTier.URGENT
    assert jnc8_1 is False

    tier2, jnc8_2 = classify_bp_tier(130, 120)
    assert tier2 == VitalTier.URGENT
    assert jnc8_2 is False

    tier3, jnc8_3 = classify_bp_tier(185, 125)
    assert tier3 == VitalTier.URGENT
    assert jnc8_3 is False


# =========================================================================
# 2. Blood Sugar Tier Boundary Unit Tests
# =========================================================================

def test_sugar_tier_urgent_boundary():
    # Urgent: < 70 (hypoglycemia) or > 300 (severe hyperglycemia)
    assert classify_sugar_tier(69.9, SugarContext.FASTING) == VitalTier.URGENT
    assert classify_sugar_tier(55.0, SugarContext.POST_MEAL) == VitalTier.URGENT
    assert classify_sugar_tier(300.1, SugarContext.FASTING) == VitalTier.URGENT
    assert classify_sugar_tier(380.0, SugarContext.POST_MEAL) == VitalTier.URGENT


def test_sugar_tier_fasting_boundaries():
    # Fasting Normal: 70 <= sugar < 100
    assert classify_sugar_tier(70.0, SugarContext.FASTING) == VitalTier.NORMAL
    assert classify_sugar_tier(99.0, SugarContext.FASTING) == VitalTier.NORMAL

    # Fasting Elevated: 100 <= sugar < 126
    assert classify_sugar_tier(100.0, SugarContext.FASTING) == VitalTier.ELEVATED
    assert classify_sugar_tier(125.0, SugarContext.FASTING) == VitalTier.ELEVATED

    # Fasting High: 126 <= sugar <= 300
    assert classify_sugar_tier(126.0, SugarContext.FASTING) == VitalTier.HIGH
    assert classify_sugar_tier(300.0, SugarContext.FASTING) == VitalTier.HIGH


def test_sugar_tier_post_meal_boundaries():
    # Post-Meal Normal: 70 <= sugar < 140
    assert classify_sugar_tier(70.0, SugarContext.POST_MEAL) == VitalTier.NORMAL
    assert classify_sugar_tier(139.0, SugarContext.POST_MEAL) == VitalTier.NORMAL

    # Post-Meal Elevated: 140 <= sugar < 200
    assert classify_sugar_tier(140.0, SugarContext.POST_MEAL) == VitalTier.ELEVATED
    assert classify_sugar_tier(199.0, SugarContext.POST_MEAL) == VitalTier.ELEVATED

    # Post-Meal High: 200 <= sugar <= 300
    assert classify_sugar_tier(200.0, SugarContext.POST_MEAL) == VitalTier.HIGH
    assert classify_sugar_tier(300.0, SugarContext.POST_MEAL) == VitalTier.HIGH


# =========================================================================
# 3. Overall Evaluation & Urgent Advisory String
# =========================================================================

def test_urgent_advisory_contains_doctor_and_call_112():
    # BP Urgent
    overall_tier, _, _, _, advisory, is_urgent = evaluate_vital_record(
        systolic=182, diastolic=95, blood_sugar=110, sugar_context=SugarContext.RANDOM
    )
    assert overall_tier == VitalTier.URGENT
    assert is_urgent is True
    assert "contact a doctor now / call 112" in advisory

    # Sugar Urgent Low
    overall_tier2, _, _, _, advisory2, is_urgent2 = evaluate_vital_record(
        systolic=120, diastolic=80, blood_sugar=62, sugar_context=SugarContext.FASTING
    )
    assert overall_tier2 == VitalTier.URGENT
    assert is_urgent2 is True
    assert "contact a doctor now / call 112" in advisory2


# =========================================================================
# 4. Voice Vitals Parser Unit Tests
# =========================================================================

def test_voice_vitals_parsing():
    p1 = parse_voice_vitals("mera BP 140 by 90 hai aur pulse 78")
    assert p1["systolic"] == 140
    assert p1["diastolic"] == 90
    assert p1["pulse"] == 78

    p2 = parse_voice_vitals("sugar 110 fasting")
    assert p2["blood_sugar"] == 110.0
    assert p2["sugar_context"] == "fasting"

    p3 = parse_voice_vitals("khana khane ke baad sugar 185")
    assert p3["blood_sugar"] == 185.0
    assert p3["sugar_context"] == "post_meal"

    p4 = parse_voice_vitals("BP 125/82 sugar 105 khali pet weight 68 kg")
    assert p4["systolic"] == 125
    assert p4["diastolic"] == 82
    assert p4["blood_sugar"] == 105.0
    assert p4["sugar_context"] == "fasting"
    assert p4["weight_kg"] == 68.0


# =========================================================================
# 5. API Integration Tests (Guest Seed Data & Anomaly Detection)
# =========================================================================

def test_vitals_api_endpoints(client):
    start_res = client.post("/api/guest/start")
    token = start_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List pre-seeded guest vitals (20 readings, including 2 anomalies)
    list_res = client.get("/api/vitals", headers=headers)
    assert list_res.status_code == 200
    vitals = list_res.json()
    assert len(vitals) == 20
    anomalies = [v for v in vitals if v["is_anomaly"]]
    assert len(anomalies) >= 2

    # Verify that Urgent anomaly contains the doctor / 112 advisory
    urgent_entries = [v for v in vitals if v["tier"] == "Urgent"]
    assert len(urgent_entries) >= 1
    assert "contact a doctor now / call 112" in urgent_entries[0]["advisory"]

    # 2. Record a new reading via POST
    post_res = client.post(
        "/api/vitals",
        headers=headers,
        json={
            "systolic": 182,
            "diastolic": 115,
            "pulse": 88,
            "blood_sugar": 120,
            "sugar_context": "random",
            "notes": "Evening test reading",
        },
    )
    assert post_res.status_code == 201
    new_vital = post_res.json()
    assert new_vital["tier"] == "Urgent"
    assert new_vital["urgent"] is True
    assert "contact a doctor now / call 112" in new_vital["advisory"]

    # 3. Voice parse endpoint
    voice_res = client.post(
        "/api/vitals/parse-voice",
        headers=headers,
        json={"voice_text": "BP 135 by 85 pulse 76"},
    )
    assert voice_res.status_code == 200
    assert voice_res.json()["systolic"] == 135
    assert voice_res.json()["diastolic"] == 85
    assert voice_res.json()["pulse"] == 76

    # 4. Summary endpoint
    sum_res = client.get("/api/vitals/summary", headers=headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_readings"] == 21
    assert summary["avg_systolic"] is not None
    assert summary["urgent_count"] >= 2
