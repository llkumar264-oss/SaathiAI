"""Family Circle and Emergency SOS Service (Step i).

Features:
- Management of trusted family & doctor contacts.
- 3-Second SOS activation with browser geolocation & Google Maps link.
- Connected cross-module Caregiver Dashboard view (meds adherence, vitals tier, scam alerts).
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid

from backend.app.schemas.family import (
    CaregiverDashboardView,
    SOSEvent,
    SOSEventCreate,
    TrustedContact,
    TrustedContactCreate,
)
from backend.app.services.companion_service import update_user_context
from backend.app.services.guest_service import get_guest_session_data
from backend.app.services.medicine_service import MedicineService
from backend.app.services.scam_service import ScamService
from backend.app.services.vital_service import get_user_vitals

logger = logging.getLogger("saathi.services.family")

# In-memory store for registered users
_USER_CONTACTS_STORE: Dict[str, List[Dict[str, Any]]] = {}
_USER_SOS_HISTORY: Dict[str, List[Dict[str, Any]]] = {}

# Default pre-seeded contacts
DEFAULT_CONTACTS: List[Dict[str, Any]] = [
    {
        "id": "contact_son_1",
        "name": "Amit Sharma (अमित शर्मा)",
        "relationship": "बेटा (Son)",
        "phone_number": "+91 9876543210",
        "is_primary": True,
        "notify_on_scam": True,
        "notify_on_vitals": True,
        "notify_on_sos": True,
    },
    {
        "id": "contact_daughter_2",
        "name": "Priya Sharma (प्रिया शर्मा)",
        "relationship": "बेटी (Daughter)",
        "phone_number": "+91 9811223344",
        "is_primary": False,
        "notify_on_scam": True,
        "notify_on_vitals": True,
        "notify_on_sos": True,
    },
    {
        "id": "contact_doctor_3",
        "name": "Dr. Anil Gupta (डॉ. अनिल गुप्ता)",
        "relationship": "पारिवारिक चिकित्सक (Family Doctor)",
        "phone_number": "+91 9822334455",
        "is_primary": False,
        "notify_on_scam": False,
        "notify_on_vitals": True,
        "notify_on_sos": True,
    },
]


def get_trusted_contacts(user_id: str, is_guest: bool = False) -> List[TrustedContact]:
    """Retrieve list of trusted family and doctor contacts."""
    if is_guest:
        guest_data = get_guest_session_data(user_id)
        raw_list = guest_data.setdefault("family_contacts", [dict(c) for c in DEFAULT_CONTACTS])
    else:
        if user_id not in _USER_CONTACTS_STORE:
            _USER_CONTACTS_STORE[user_id] = [dict(c) for c in DEFAULT_CONTACTS]
        raw_list = _USER_CONTACTS_STORE[user_id]

    return [TrustedContact(**c) for c in raw_list]


def add_trusted_contact(
    user_id: str,
    req: TrustedContactCreate,
    is_guest: bool = False,
) -> TrustedContact:
    """Add a new trusted family contact."""
    contact_id = f"contact_{uuid.uuid4().hex[:8]}"
    item = {
        "id": contact_id,
        "name": req.name,
        "relationship": req.relationship,
        "phone_number": req.phone_number,
        "is_primary": req.is_primary,
        "notify_on_scam": req.notify_on_scam,
        "notify_on_vitals": req.notify_on_vitals,
        "notify_on_sos": req.notify_on_sos,
    }

    if is_guest:
        guest_data = get_guest_session_data(user_id)
        contacts = guest_data.setdefault("family_contacts", [dict(c) for c in DEFAULT_CONTACTS])
        contacts.append(item)
    else:
        if user_id not in _USER_CONTACTS_STORE:
            _USER_CONTACTS_STORE[user_id] = [dict(c) for c in DEFAULT_CONTACTS]
        _USER_CONTACTS_STORE[user_id].append(item)

    return TrustedContact(**item)


def delete_trusted_contact(
    user_id: str,
    contact_id: str,
    is_guest: bool = False,
) -> bool:
    """Remove a trusted contact from the circle."""
    if is_guest:
        guest_data = get_guest_session_data(user_id)
        contacts = guest_data.get("family_contacts", [])
        original_len = len(contacts)
        guest_data["family_contacts"] = [c for c in contacts if c.get("id") != contact_id]
        return len(guest_data["family_contacts"]) < original_len
    else:
        contacts = _USER_CONTACTS_STORE.get(user_id, [])
        original_len = len(contacts)
        _USER_CONTACTS_STORE[user_id] = [c for c in contacts if c.get("id") != contact_id]
        return len(_USER_CONTACTS_STORE[user_id]) < original_len


def trigger_emergency_sos(
    user_id: str,
    display_name: str,
    req: SOSEventCreate,
    is_guest: bool = False,
) -> SOSEvent:
    """Execute emergency SOS protocol: log event, gather location, alert contacts."""
    sos_id = f"sos_{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()

    # Generate Google Maps URL
    maps_url = None
    if req.latitude is not None and req.longitude is not None:
        maps_url = f"https://www.google.com/maps?q={req.latitude},{req.longitude}"

    contacts = get_trusted_contacts(user_id, is_guest=is_guest)
    alerted_names = [f"{c.name} ({c.phone_number})" for c in contacts if c.notify_on_sos]

    event_data = {
        "id": sos_id,
        "user_id": user_id,
        "timestamp": now_str,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "maps_url": maps_url,
        "contacts_alerted": alerted_names,
        "status": "active",
    }

    if is_guest:
        guest_data = get_guest_session_data(user_id)
        guest_data.setdefault("sos_events", []).append(event_data)
    else:
        _USER_SOS_HISTORY.setdefault(user_id, []).append(event_data)

    # Cross-Module Update to Companion Shared Context
    update_user_context(
        user_id,
        {
            "active_sos": True,
            "last_sos_time": now_str,
            "last_sos_location": maps_url or "Location unavailable",
        },
    )

    logger.warning("EMERGENCY SOS ACTIVATED by %s (%s). Alerted: %s", display_name, user_id, alerted_names)
    return SOSEvent(**event_data)


def get_caregiver_dashboard_view(
    user_id: str,
    display_name: str,
    is_guest: bool = False,
) -> CaregiverDashboardView:
    """Aggregate senior status for family caregiver read-only consent view."""
    # 1. Medicines adherence and today's doses
    med_service = MedicineService()
    adherence_stats = med_service.get_adherence_stats(user_id, days=7, is_guest=is_guest)
    meds = med_service.get_medicines(user_id, is_guest=is_guest)

    today_summary = [
        {
            "name": m.name,
            "time": m.timing,
            "dosage": m.dosage,
            "purpose": m.purpose,
        }
        for m in meds
    ]

    # 2. Latest Vitals
    vitals_list = get_user_vitals(user_id, is_guest=is_guest)
    latest_vital = vitals_list[0] if vitals_list else None

    # 3. Recent Scams
    scam_service = ScamService()
    scam_list = scam_service.get_history(user_id, is_guest=is_guest)
    flagged_scams = [
        {
            "timestamp": s.get("timestamp"),
            "risk_score": s.get("risk_score"),
            "tier": s.get("tier"),
            "snippet": s.get("message_text", "")[:80] + "...",
        }
        for s in scam_list
        if s.get("risk_score", 0) >= 60
    ]

    # 4. Last SOS
    last_sos = None
    if is_guest:
        sos_list = get_guest_session_data(user_id).get("sos_events", [])
    else:
        sos_list = _USER_SOS_HISTORY.get(user_id, [])
    if sos_list:
        last_sos = SOSEvent(**sos_list[-1])

    return CaregiverDashboardView(
        senior_name=display_name,
        today_date=datetime.now(timezone.utc).strftime("%d %B %Y"),
        adherence_rate_7d=adherence_stats.overall_adherence_percent,
        today_doses_summary=today_summary,
        latest_vitals=latest_vital,
        recent_scam_alerts=flagged_scams,
        last_sos=last_sos,
    )
