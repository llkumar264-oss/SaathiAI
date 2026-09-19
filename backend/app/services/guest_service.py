"""Guest Session Service.

Provides isolated pre-seeded data for demo/evaluation:
- 3 medicines with 7 days of dose history
- 20 vitals readings (including 2 anomalies: 1 urgent BP, 1 high sugar)
- 3 scam check history logs
- 1 sample electricity bill document
Data resets on daily boundary or when requested.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
import uuid

# In-memory store for guest user data isolated by guest session ID
_GUEST_DATA_STORE: Dict[str, Dict[str, Any]] = {}


def generate_guest_seed_data(guest_id: str) -> Dict[str, Any]:
    """Generate realistic senior citizen demo dataset."""
    now = datetime.now(timezone.utc)
    
    # 1. Three Medicines with 7 Days of Dose History
    med_amlodipine_id = f"med_amlo_{guest_id[:6]}"
    med_metformin_id = f"med_metf_{guest_id[:6]}"
    med_atorva_id = f"med_ator_{guest_id[:6]}"

    medicines = [
        {
            "id": med_amlodipine_id,
            "name": "Amlodipine (एम्लोडिपिन)",
            "dosage": "5mg",
            "frequency": "Once daily - Morning after breakfast",
            "timing": "08:30",
            "purpose": "Blood Pressure control (रक्तचाप नियंत्रण)",
            "instructions": "Take with water after breakfast.",
            "is_active": True,
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
        {
            "id": med_metformin_id,
            "name": "Metformin (मेटफॉर्मिन)",
            "dosage": "500mg",
            "frequency": "Twice daily - Morning & Night with meals",
            "timing": "09:00, 20:30",
            "purpose": "Blood Sugar management (शुगर नियंत्रण)",
            "instructions": "Take during or immediately after meals.",
            "is_active": True,
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
        {
            "id": med_atorva_id,
            "name": "Atorvastatin (एटोरवास्टेटिन)",
            "dosage": "10mg",
            "frequency": "Once daily - Night before sleep",
            "timing": "21:30",
            "purpose": "Cholesterol & Heart protection (कोलेस्ट्रॉल)",
            "instructions": "Take at bedtime.",
            "is_active": True,
            "created_at": (now - timedelta(days=20)).isoformat(),
        },
    ]

    # Dose logs for past 7 days (realistic: 1 skipped, 1 delayed, rest taken)
    dose_history: List[Dict[str, Any]] = []
    for day_offset in range(7, 0, -1):
        log_date = (now - timedelta(days=day_offset)).date().isoformat()
        
        # Day 2 had a missed metformin dose
        status_metformin = "skipped" if day_offset == 2 else "taken"
        status_amlo = "taken"
        status_atorva = "taken"

        dose_history.extend([
            {
                "id": str(uuid.uuid4()),
                "medicine_id": med_amlodipine_id,
                "medicine_name": "Amlodipine 5mg",
                "date": log_date,
                "scheduled_time": "08:30",
                "status": status_amlo,
                "taken_at": f"{log_date}T08:45:00Z",
            },
            {
                "id": str(uuid.uuid4()),
                "medicine_id": med_metformin_id,
                "medicine_name": "Metformin 500mg",
                "date": log_date,
                "scheduled_time": "09:00",
                "status": status_metformin,
                "taken_at": f"{log_date}T09:10:00Z" if status_metformin == "taken" else None,
                "reason_skipped": "Felt slight acidity" if status_metformin == "skipped" else None,
            },
            {
                "id": str(uuid.uuid4()),
                "medicine_id": med_atorva_id,
                "medicine_name": "Atorvastatin 10mg",
                "date": log_date,
                "scheduled_time": "21:30",
                "status": status_atorva,
                "taken_at": f"{log_date}T21:40:00Z",
            },
        ])

    # 2. Twenty Vitals Readings (including 2 anomalies)
    vitals: List[Dict[str, Any]] = []
    # Generate 18 normal/mild readings across past 14 days
    base_readings = [
        (130, 84, 74, 110, "Normal"),
        (128, 82, 72, 115, "Normal"),
        (135, 86, 76, 120, "Normal for age 65+"),
        (132, 85, 75, 112, "Normal"),
        (134, 88, 78, 118, "Normal"),
        (126, 80, 70, 108, "Normal"),
        (138, 87, 80, 122, "Elevated"),
        (131, 83, 73, 114, "Normal"),
        (129, 81, 71, 109, "Normal"),
        (136, 89, 79, 124, "Elevated"),
        (133, 84, 75, 113, "Normal"),
        (130, 82, 72, 111, "Normal"),
        (127, 80, 70, 107, "Normal"),
        (135, 86, 76, 119, "Normal"),
        (132, 83, 74, 115, "Normal"),
        (134, 85, 77, 121, "Normal"),
        (128, 81, 72, 110, "Normal"),
        (130, 84, 73, 112, "Normal"),
    ]

    for i, (sys, dia, pulse, sugar, note) in enumerate(base_readings):
        t = now - timedelta(days=(14 - i * 0.7))
        vitals.append({
            "id": f"vital_{i+1}_{guest_id[:6]}",
            "timestamp": t.isoformat(),
            "systolic": sys,
            "diastolic": dia,
            "pulse": pulse,
            "blood_sugar": sugar,
            "sugar_context": "fasting" if i % 2 == 0 else "post_meal",
            "tier": "Elevated" if sys > 135 or dia > 85 else "Normal",
            "is_anomaly": False,
            "notes": note,
        })

    # Anomaly 1: Urgent Hypertensive Crisis (Systolic >= 180 or Diastolic >= 120)
    vitals.append({
        "id": f"vital_anom1_{guest_id[:6]}",
        "timestamp": (now - timedelta(hours=36)).isoformat(),
        "systolic": 184,
        "diastolic": 112,
        "pulse": 98,
        "blood_sugar": 128,
        "sugar_context": "random",
        "tier": "Urgent",
        "is_anomaly": True,
        "anomaly_reason": "Urgent Tier: Systolic >= 180 mmHg. Immediate medical attention advised.",
        "notes": "Felt dizziness after walking in hot sun.",
    })

    # Anomaly 2: High Sugar spike (> 200 mg/dL)
    vitals.append({
        "id": f"vital_anom2_{guest_id[:6]}",
        "timestamp": (now - timedelta(hours=14)).isoformat(),
        "systolic": 138,
        "diastolic": 86,
        "pulse": 82,
        "blood_sugar": 245,
        "sugar_context": "post_meal",
        "tier": "High",
        "is_anomaly": True,
        "anomaly_reason": "Elevated spike: Post-meal blood sugar > 200 mg/dL.",
        "notes": "Had sweets at family gathering.",
    })

    # 3. Three Scam Checks (2 high risk scam, 1 safe)
    scam_history = [
        {
            "id": f"scam_1_{guest_id[:6]}",
            "timestamp": (now - timedelta(days=2)).isoformat(),
            "message_text": "Electricity Alert: Dear consumer, your power will be disconnected TONIGHT at 9:30 PM due to pending bill. Call electricity officer immediately at 9812345678 or install support APK.",
            "risk_score": 96,
            "tier": "High Risk (धोखाधड़ी)",
            "signals": ["Electricity cut-off threat", "Urgent deadline tonight", "Unknown mobile contact", "APK download link"],
            "explanation": "यह एक जानी-पहचानी बिजली बिल की धोखाधड़ी (Scam) है। बिजली विभाग कभी व्यक्तिगत नंबर से ऐसे धमकी भरे मैसेज नहीं भेजता। कोई ऐप डाउनलोड न करें।",
            "family_alerted": True,
        },
        {
            "id": f"scam_2_{guest_id[:6]}",
            "timestamp": (now - timedelta(days=1)).isoformat(),
            "message_text": "State Bank of India: Your YONO account has been suspended due to pending KYC update. Click here to verify PAN & Aadhaar to avoid permanent freeze: http://bit.ly/sbi-kyc-verify",
            "risk_score": 98,
            "tier": "High Risk (धोखाधड़ी)",
            "signals": ["Fake bank alert", "Suspicious shortened link", "PAN/Aadhaar credential phishing", "Account suspension threat"],
            "explanation": "यह बैंक के नाम पर फ़िशिंग लिंक है। बैंक कभी भी SMS में लिंक भेजकर पैन या आधार अपडेट करने को नहीं कहते। लिंक पर क्लिक न करें।",
            "family_alerted": False,
        },
        {
            "id": f"scam_3_{guest_id[:6]}",
            "timestamp": (now - timedelta(hours=4)).isoformat(),
            "message_text": "Your OTP for Aadhaar authentication is 649201. Valid for 10 minutes. UIDAI will never call or ask for your OTP. Do not share with anyone.",
            "risk_score": 5,
            "tier": "Safe (सुरक्षित संदेश)",
            "signals": ["Standard official UIDAI format", "Warns against sharing OTP", "No malicious links"],
            "explanation": "यह आधार का वैध OTP संदेश है। बस ध्यान रखें कि यह OTP किसी को भी फ़ोन या मैसेज पर शेयर न करें।",
            "family_alerted": False,
        },
    ]

    # 4. Sample Electricity Bill Document
    sample_bill = {
        "id": f"doc_bill_{guest_id[:6]}",
        "title": "BSES Rajdhani Electricity Bill - August 2026",
        "doc_type": "electricity_bill",
        "uploaded_at": (now - timedelta(days=3)).isoformat(),
        "sections": {
            "summary": "यह BSES राजधानी का बिजली का बिल है, जो अगस्त 2026 के महीने का है। कुल बिल राशि ₹1,840 है।",
            "important_numbers": [
                {"label": "उपभोक्ता संख्या (CA Number)", "value": "102938475"},
                {"label": "कुल देय राशि (Bill Amount)", "value": "₹1,840"},
                {"label": "खपत की गई यूनिट (Units)", "value": "240 kWh"},
            ],
            "deadlines": [
                {
                    "title": "बिल भुगतान की अंतिम तिथि (Due Date)",
                    "due_date": (now + timedelta(days=5)).date().isoformat(),
                    "converted_to_reminder": True,
                }
            ],
            "next_steps": [
                "अंतिम तारीख से पहले ₹1,840 का भुगतान करें ताकि ₹150 की लेट फीस न लगे।",
                "भुगतान के लिए अपने अधिकृत BSES केंद्र, UPI ऐप (Paytm/GPay), या बिजली बिल काउंटर का उपयोग करें।",
            ],
        },
    }

    return {
        "guest_id": guest_id,
        "created_at": now.isoformat(),
        "medicines": medicines,
        "dose_history": dose_history,
        "vitals": vitals,
        "scam_history": scam_history,
        "documents": [sample_bill],
    }


def get_guest_session_data(guest_id: str) -> Dict[str, Any]:
    """Retrieve or initialize pre-seeded guest session."""
    if guest_id not in _GUEST_DATA_STORE:
        _GUEST_DATA_STORE[guest_id] = generate_guest_seed_data(guest_id)
    return _GUEST_DATA_STORE[guest_id]


def reset_guest_session(guest_id: str) -> Dict[str, Any]:
    """Reset guest session back to pristine seed data."""
    _GUEST_DATA_STORE[guest_id] = generate_guest_seed_data(guest_id)
    return _GUEST_DATA_STORE[guest_id]
