"""Health Vitals Service (Step g).

Features:
- 4-Tier classification for Blood Pressure and Blood Glucose (Normal, Elevated, High, Urgent).
- JNC-8 age 60+ targets: SBP < 150 mmHg and DBP < 90 mmHg.
- Urgent emergency condition: (systolic >= 180 or diastolic >= 120, sugar < 70 or > 300)
  triggering explicit "contact a doctor now / call 112" advisory.
- Voice parser supporting Hindi, Hinglish, and English phrases.
- ML Anomaly Detector using scikit-learn IsolationForest + statistical baseline for >= 14 readings.
- In-memory repository with guest session isolation and pre-seeded readings.
"""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import uuid

import numpy as np
from sklearn.ensemble import IsolationForest

from backend.app.schemas.vital import (
    SugarContext,
    VitalCreateRequest,
    VitalEntry,
    VitalsSummary,
    VitalTier,
)
from backend.app.services.guest_service import get_guest_session_data as get_guest_data

logger = logging.getLogger("saathi.services.vitals")

# In-memory store for registered users: uid -> List[VitalEntry]
_USER_VITALS_STORE: Dict[str, List[Dict[str, Any]]] = {}


def classify_bp_tier(systolic: Optional[int], diastolic: Optional[int]) -> Tuple[Optional[VitalTier], bool]:
    """Classify blood pressure tier using JNC-8 guidelines for age 60+.
    
    Tiers:
    - Urgent: systolic >= 180 or diastolic >= 120 (Hypertensive crisis)
    - High: systolic >= 140 or diastolic >= 90 (Stage 2)
    - Elevated: (systolic >= 120 or diastolic >= 80) and not High/Urgent
    - Normal: systolic < 120 and diastolic < 80
    
    JNC-8 Target for age 60+: systolic < 150 and diastolic < 90.
    """
    if systolic is None and diastolic is None:
        return None, True

    sys_val = systolic if systolic is not None else 120
    dia_val = diastolic if diastolic is not None else 80

    jnc8_target_met = sys_val < 150 and dia_val < 90

    if sys_val >= 180 or dia_val >= 120:
        return VitalTier.URGENT, jnc8_target_met
    if sys_val >= 140 or dia_val >= 90:
        return VitalTier.HIGH, jnc8_target_met
    if sys_val >= 120 or dia_val >= 80:
        return VitalTier.ELEVATED, jnc8_target_met
    return VitalTier.NORMAL, jnc8_target_met


def classify_sugar_tier(sugar: Optional[float], context: SugarContext) -> Optional[VitalTier]:
    """Classify blood glucose tier based on measurement context.
    
    Tiers:
    - Urgent: sugar < 70 (hypoglycemia) or sugar > 300 (severe hyperglycemia)
    - Fasting:
        Normal: 70 <= sugar < 100
        Elevated: 100 <= sugar < 126
        High: 126 <= sugar <= 300
    - Post-meal / Random:
        Normal: 70 <= sugar < 140
        Elevated: 140 <= sugar < 200
        High: 200 <= sugar <= 300
    """
    if sugar is None:
        return None

    if sugar < 70 or sugar > 300:
        return VitalTier.URGENT

    if context == SugarContext.FASTING:
        if sugar < 100:
            return VitalTier.NORMAL
        elif sugar < 126:
            return VitalTier.ELEVATED
        else:
            return VitalTier.HIGH
    else:  # POST_MEAL or RANDOM
        if sugar < 140:
            return VitalTier.NORMAL
        elif sugar < 200:
            return VitalTier.ELEVATED
        else:
            return VitalTier.HIGH


def evaluate_vital_record(
    systolic: Optional[int],
    diastolic: Optional[int],
    blood_sugar: Optional[float],
    sugar_context: SugarContext,
) -> Tuple[VitalTier, Optional[VitalTier], Optional[VitalTier], bool, str, bool]:
    """Evaluate full tier classification, JNC-8 target, advisory message, and urgent flag."""
    bp_tier, jnc8_target_met = classify_bp_tier(systolic, diastolic)
    sugar_tier = classify_sugar_tier(blood_sugar, sugar_context)

    # Determine overall highest tier
    tier_order = {VitalTier.URGENT: 4, VitalTier.HIGH: 3, VitalTier.ELEVATED: 2, VitalTier.NORMAL: 1}
    overall_score = 1

    if bp_tier:
        overall_score = max(overall_score, tier_order[bp_tier])
    if sugar_tier:
        overall_score = max(overall_score, tier_order[sugar_tier])

    score_to_tier = {4: VitalTier.URGENT, 3: VitalTier.HIGH, 2: VitalTier.ELEVATED, 1: VitalTier.NORMAL}
    overall_tier = score_to_tier[overall_score]
    is_urgent = overall_tier == VitalTier.URGENT

    if is_urgent:
        advisory = (
            "⚠️ URGENT: Blood pressure or sugar level is at a critical threshold. "
            "Please contact a doctor now / call 112 immediately. "
            "(तत्काल डॉक्टर से संपर्क करें या 112 पर कॉल करें)"
        )
    elif overall_tier == VitalTier.HIGH:
        advisory = (
            "Reading is high. Rest calmly, take prescribed medication if due, "
            "and re-check in 2 hours."
        )
    elif overall_tier == VitalTier.ELEVATED:
        advisory = (
            "Reading is slightly elevated. Keep well-hydrated, avoid extra salt/sugar, "
            "and monitor your next scheduled reading."
        )
    else:
        advisory = (
            "Readings are in the healthy normal range. Well done maintaining your health routine!"
        )

    return overall_tier, bp_tier, sugar_tier, jnc8_target_met, advisory, is_urgent


def parse_voice_vitals(text: str) -> Dict[str, Any]:
    """Extract numeric BP, pulse, and glucose from natural voice phrases in Hindi/English/Hinglish."""
    result: Dict[str, Any] = {
        "systolic": None,
        "diastolic": None,
        "pulse": None,
        "blood_sugar": None,
        "sugar_context": SugarContext.RANDOM.value,
        "weight_kg": None,
    }

    t = text.lower().strip()

    # 1. Blood Pressure: e.g. "bp 140/90", "140 by 90", "bp 135 aur 85", "140/85"
    bp_match = re.search(r'(?:bp|blood\s*pressure|रक्तचाप)?\s*(\d{2,3})\s*(?:/|by|aur|और|\-|\s)\s*(\d{2,3})', t)
    if bp_match:
        s = int(bp_match.group(1))
        d = int(bp_match.group(2))
        if 70 <= s <= 260 and 40 <= d <= 160 and s > d:
            result["systolic"] = s
            result["diastolic"] = d

    # 2. Pulse / Heart rate: e.g. "pulse 76", "heart rate 82", "nabz 74"
    pulse_match = re.search(r'(?:pulse|heart\s*rate|nabz|धड़कन)\s*(?:is|=|hai|है)?\s*(\d{2,3})', t)
    if pulse_match:
        p = int(pulse_match.group(1))
        if 40 <= p <= 200:
            result["pulse"] = p

    # 3. Blood Sugar: e.g. "sugar 110 fasting", "khali pet sugar 105", "post meal sugar 165"
    sugar_match = re.search(r'(?:sugar|glucose|शुगर)\s*(?:is|=|hai|है)?\s*(\d{2,3})', t)
    if not sugar_match:
        sugar_match = re.search(r'(\d{2,3})\s*(?:mg/dl|sugar|शुगर)', t)

    if sugar_match:
        sugar_val = float(sugar_match.group(1))
        if 30 <= sugar_val <= 500:
            result["blood_sugar"] = sugar_val

            # Determine context
            if any(w in t for w in ["fasting", "khali pet", "खाली पेट", "subah"]):
                result["sugar_context"] = SugarContext.FASTING.value
            elif any(w in t for w in ["post", "after food", "khana khane ke baad", "pp", "खाने के बाद"]):
                result["sugar_context"] = SugarContext.POST_MEAL.value
            else:
                result["sugar_context"] = SugarContext.RANDOM.value

    # 4. Weight: e.g. "weight 65 kg", "wazan 70"
    weight_match = re.search(r'(?:weight|wazan|वजन)\s*(?:is|=|hai|है)?\s*(\d{2,3}(?:\.\d)?)', t)
    if weight_match:
        result["weight_kg"] = float(weight_match.group(1))

    return result


def detect_anomalies_with_ml(readings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect statistical outliers / anomalies using IsolationForest for >= 14 readings."""
    if len(readings) < 14:
        return readings

    # Extract feature matrix [systolic, diastolic, pulse, sugar]
    X_rows = []
    valid_indices = []
    for idx, r in enumerate(readings):
        s = r.get("systolic") or 125
        d = r.get("diastolic") or 82
        p = r.get("pulse") or 75
        g = r.get("blood_sugar") or 115
        X_rows.append([float(s), float(d), float(p), float(g)])
        valid_indices.append(idx)

    X = np.array(X_rows)

    # Train personal baseline IsolationForest
    iso = IsolationForest(contamination=0.1, random_state=42)
    predictions = iso.fit_predict(X)

    # Compute personal means for friendly explanation
    mean_sys = float(np.mean(X[:, 0]))
    mean_dia = float(np.mean(X[:, 1]))
    mean_sugar = float(np.mean(X[:, 3]))

    updated = []
    for idx, r in enumerate(readings):
        item = dict(r)
        # If model flags outlier (-1) or urgent tier
        is_urgent = item.get("tier") == VitalTier.URGENT.value or item.get("urgent", False)
        is_model_anomaly = predictions[idx] == -1

        if is_urgent or is_model_anomaly:
            item["is_anomaly"] = True
            if not item.get("anomaly_reason"):
                reasons = []
                if is_urgent:
                    reasons.append("Critical vital threshold reached")
                if item.get("systolic") and abs(item["systolic"] - mean_sys) > 20:
                    reasons.append(f"Systolic {item['systolic']} deviates from typical ~{int(mean_sys)}")
                if item.get("blood_sugar") and abs(item["blood_sugar"] - mean_sugar) > 40:
                    reasons.append(f"Sugar {item['blood_sugar']} deviates from typical ~{int(mean_sugar)}")
                item["anomaly_reason"] = "; ".join(reasons) if reasons else "Unusual statistical deviation from personal baseline"
        updated.append(item)

    return updated


def normalize_vital_entry(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure complete schemas for raw or pre-seeded entries."""
    item = dict(raw)
    sys_val = item.get("systolic")
    dia_val = item.get("diastolic")
    sugar_val = item.get("blood_sugar")
    raw_ctx = item.get("sugar_context", "random")
    try:
        ctx = SugarContext(raw_ctx)
    except Exception:
        ctx = SugarContext.RANDOM

    overall_tier, bp_tier, sugar_tier, jnc8_target, advisory, is_urgent = evaluate_vital_record(
        systolic=sys_val,
        diastolic=dia_val,
        blood_sugar=sugar_val,
        sugar_context=ctx,
    )

    if "tier" not in item or item["tier"] not in [t.value for t in VitalTier]:
        item["tier"] = overall_tier.value
    if "bp_tier" not in item:
        item["bp_tier"] = bp_tier.value if bp_tier else None
    if "sugar_tier" not in item:
        item["sugar_tier"] = sugar_tier.value if sugar_tier else None
    if "jnc8_target_met" not in item:
        item["jnc8_target_met"] = jnc8_target
    if not item.get("advisory"):
        item["advisory"] = advisory
    if "urgent" not in item:
        item["urgent"] = is_urgent or item.get("tier") == VitalTier.URGENT.value
    return item


def get_user_vitals(user_id: str, is_guest: bool = False, days_limit: int = 30) -> List[Dict[str, Any]]:
    """Retrieve vitals list for user or guest."""
    if is_guest:
        guest_data = get_guest_data(user_id)
        raw_list = guest_data.get("vitals", [])
    else:
        raw_list = _USER_VITALS_STORE.get(user_id, [])

    normalized = [normalize_vital_entry(r) for r in raw_list]
    sorted_vitals = sorted(normalized, key=lambda x: x.get("timestamp", ""), reverse=True)
    return sorted_vitals


def record_vital_reading(
    user_id: str,
    req: VitalCreateRequest,
    is_guest: bool = False,
) -> Dict[str, Any]:
    """Record new reading, calculate tier, advisory, and update storage."""
    overall_tier, bp_tier, sugar_tier, jnc8_target, advisory, is_urgent = evaluate_vital_record(
        systolic=req.systolic,
        diastolic=req.diastolic,
        blood_sugar=req.blood_sugar,
        sugar_context=req.sugar_context,
    )

    vital_id = f"vital_{uuid.uuid4().hex[:8]}"
    entry = {
        "id": vital_id,
        "timestamp": req.timestamp or datetime.now(timezone.utc).isoformat(),
        "systolic": req.systolic,
        "diastolic": req.diastolic,
        "pulse": req.pulse,
        "blood_sugar": req.blood_sugar,
        "sugar_context": req.sugar_context.value,
        "weight_kg": req.weight_kg,
        "tier": overall_tier.value,
        "bp_tier": bp_tier.value if bp_tier else None,
        "sugar_tier": sugar_tier.value if sugar_tier else None,
        "jnc8_target_met": jnc8_target,
        "is_anomaly": is_urgent,
        "anomaly_reason": advisory if is_urgent else None,
        "advisory": advisory,
        "urgent": is_urgent,
        "notes": req.notes,
    }

    if is_guest:
        guest_data = get_guest_data(user_id)
        guest_data.setdefault("vitals", []).append(entry)
    else:
        _USER_VITALS_STORE.setdefault(user_id, []).append(entry)

    # If urgent, update companion context
    if is_urgent:
        from backend.app.services.companion_service import update_user_context
        update_user_context(
            user_id,
            {"last_vitals_alert": f"Urgent vitals recorded: BP {req.systolic}/{req.diastolic}, Sugar {req.blood_sugar}"},
        )

    return entry


def get_vitals_summary(user_id: str, is_guest: bool = False) -> VitalsSummary:
    """Compute statistics, averages, anomaly count, and tier summaries."""
    all_readings = get_user_vitals(user_id, is_guest=is_guest)
    readings_with_ml = detect_anomalies_with_ml(all_readings)

    if not readings_with_ml:
        return VitalsSummary(total_readings=0)

    systolics = [r["systolic"] for r in readings_with_ml if r.get("systolic")]
    diastolics = [r["diastolic"] for r in readings_with_ml if r.get("diastolic")]
    pulses = [r["pulse"] for r in readings_with_ml if r.get("pulse")]
    sugars = [r["blood_sugar"] for r in readings_with_ml if r.get("blood_sugar")]

    urgent_count = sum(1 for r in readings_with_ml if r.get("tier") == VitalTier.URGENT.value or r.get("urgent"))
    anomalies_count = sum(1 for r in readings_with_ml if r.get("is_anomaly"))

    entries = [VitalEntry(**r) for r in readings_with_ml]
    latest = entries[0] if entries else None

    return VitalsSummary(
        total_readings=len(readings_with_ml),
        latest_reading=latest,
        avg_systolic=round(float(np.mean(systolics)), 1) if systolics else None,
        avg_diastolic=round(float(np.mean(diastolics)), 1) if diastolics else None,
        avg_pulse=round(float(np.mean(pulses)), 1) if pulses else None,
        avg_sugar=round(float(np.mean(sugars)), 1) if sugars else None,
        urgent_count=urgent_count,
        anomalies_count=anomalies_count,
        readings=entries,
    )
