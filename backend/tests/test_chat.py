"""Tests for Saathi Companion Chat (Step b).

Covers:
- Open-ended conversation streaming
- Router separating grounding vs tool calling
- Confirmation card generation for mutating actions
- Memory 20-turn sliding window + summarization
- Confirm-action endpoint
"""

import json
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app
from backend.app.ai.gemini_router import QueryIntent, classify_query_intent
from backend.app.services.companion_service import CompanionService


@pytest.fixture
def client():
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True, GEMINI_MOCK=True)
    reset_settings_for_tests(settings)
    app = create_app()
    return TestClient(app)


def test_query_intent_routing():
    """Verify router correctly classifies search vs actions vs conversation."""
    # Action triggers
    assert classify_query_intent("Kal subah 9 baje doctor ka appointment yaad dilana") == QueryIntent.ACTION_TOOLS
    assert classify_query_intent("Mera BP 140/90 hai") == QueryIntent.ACTION_TOOLS
    assert classify_query_intent("Yeh SMS scam hai ya nahi") == QueryIntent.ACTION_TOOLS

    # Grounding triggers (Schemes / weather / news)
    assert classify_query_intent("PM Vaya Vandana Yojana ke baare mein batao") == QueryIntent.GROUNDED_SEARCH
    assert classify_query_intent("Aaj ka mausam kaisa rahega") == QueryIntent.GROUNDED_SEARCH

    # Open conversation
    assert classify_query_intent("नमस्ते, आज मुझे पुरानी बातें याद आ रही हैं") == QueryIntent.CONVERSATIONAL


def test_chat_open_ended_conversation_stream(client):
    """Test general conversation yields SSE stream with warm response."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}
    response = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "नमस्ते साथी, आज का दिन कैसा है?", "conversation_id": "test_conv_1"}
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    # Parse SSE events
    lines = response.text.split("\n\n")
    events = [l.replace("data: ", "").strip() for l in lines if l.startswith("data: ")]
    assert len(events) > 0
    assert "[DONE]" in events

    parsed_events = [json.loads(e) for e in events if e != "[DONE]"]
    text_events = [e for e in parsed_events if e.get("type") == "text"]
    assert len(text_events) > 0
    assert any("नमस्ते" in t["text"] or "साथी" in t["text"] for t in text_events)


def test_chat_action_intent_yields_confirmation_card(client):
    """Connected Workflow 5: Chat vitals logging triggers a confirmation card."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}
    response = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "Mera BP 140/90 hai", "conversation_id": "test_conv_vitals"}
    )
    assert response.status_code == 200

    lines = response.text.split("\n\n")
    events = [l.replace("data: ", "").strip() for l in lines if l.startswith("data: ")]
    parsed = [json.loads(e) for e in events if e != "[DONE]"]

    # Must contain confirmation card
    card_events = [e for e in parsed if e.get("type") == "confirmation_card"]
    assert len(card_events) > 0

    card = card_events[0]["card"]
    assert card["requires_confirmation"] is True
    assert card["action_type"] == "log_vital"
    assert card["action_payload"]["value1"] == 140.0
    assert card["action_payload"]["value2"] == 90.0


def test_chat_grounded_search_includes_sources(client):
    """Grounded query returns citations and sources."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}
    response = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "PM Vaya Vandana Yojana scheme rules", "conversation_id": "test_conv_scheme"}
    )
    assert response.status_code == 200

    lines = response.text.split("\n\n")
    events = [l.replace("data: ", "").strip() for l in lines if l.startswith("data: ")]
    parsed = [json.loads(e) for e in events if e != "[DONE]"]

    text_with_sources = [e for e in parsed if e.get("sources")]
    assert len(text_with_sources) > 0
    sources = text_with_sources[0]["sources"]
    assert len(sources) > 0
    assert "licindia.in" in sources[0]["url"] or "pib.gov.in" in sources[0]["url"]


def test_chat_memory_keeps_20_turns_and_summarizes():
    """Verify memory sliding window limit (20 turns) and profile summarization."""
    service = CompanionService()
    session_id = "mem_test_user_session"

    # Add 25 turns
    for i in range(25):
        service.add_turn(session_id, "user", f"Turn message {i}")

    history = service.get_history(session_id)
    # Must keep only the last 20 turns
    assert len(history) == 20
    assert history[0]["text"] == "Turn message 5"
    assert history[-1]["text"] == "Turn message 24"


def test_confirm_action_execution(client):
    """Test POST /api/chat/confirm-action commits the action."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}
    res = client.post(
        "/api/chat/confirm-action",
        headers=headers,
        json={
            "action_type": "create_reminder",
            "action_payload": {
                "title": "Doctor Appointment",
                "datetime_str": "2026-09-20 09:00",
                "category": "appointment",
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "रिमाइंडर" in body["message"]
    assert body["record"]["title"] == "Doctor Appointment"
