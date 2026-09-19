"""Saathi Companion Service.

Manages conversational sessions:
- Maintains last 20 turns verbatim per user
- Long-term memory profile summarization
- Dispatches Gemini responses, tool calls, and confirmation cards
"""

from datetime import datetime, timezone
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
import uuid

from backend.app.ai.gemini_client import GeminiClient
from backend.app.ai.tools import create_confirmation_card

logger = logging.getLogger("saathi.services.companion")

# In-memory storage for active conversations
# Maps session_id -> list of turns [{"role": "user"|"model", "text": "...", "timestamp": "..."}]
_CONVERSATION_HISTORY: Dict[str, List[Dict[str, Any]]] = {}
_USER_SUMMARIZED_PROFILES: Dict[str, str] = {}
_USER_SHARED_CONTEXT: Dict[str, Dict[str, Any]] = {}


def update_user_context(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update shared user context that Saathi reads across all modules."""
    if user_id not in _USER_SHARED_CONTEXT:
        _USER_SHARED_CONTEXT[user_id] = {}
    _USER_SHARED_CONTEXT[user_id].update(updates)
    return _USER_SHARED_CONTEXT[user_id]


def get_user_context(user_id: str) -> Dict[str, Any]:
    """Retrieve shared cross-module context for a user."""
    return _USER_SHARED_CONTEXT.get(user_id, {})


class CompanionService:
    """Service orchestrating conversations and actions with Saathi."""

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve recent conversation history."""
        return _CONVERSATION_HISTORY.get(session_id, [])

    def add_turn(self, session_id: str, role: str, text: str) -> None:
        """Add a turn to conversation memory and summarize if > 20 turns."""
        if session_id not in _CONVERSATION_HISTORY:
            _CONVERSATION_HISTORY[session_id] = []

        _CONVERSATION_HISTORY[session_id].append({
            "id": str(uuid.uuid4()),
            "role": role,
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Memory Rule: keep last 20 turns verbatim. If > 20, summarize older turns
        history = _CONVERSATION_HISTORY[session_id]
        if len(history) > 20:
            older_turns = history[:-20]
            _CONVERSATION_HISTORY[session_id] = history[-20:]
            self._summarize_older_memory(session_id, older_turns)

    def _summarize_older_memory(self, session_id: str, turns: List[Dict[str, Any]]) -> None:
        """Summarize older conversation turns into persistent profile highlights."""
        summary_bullets = [f"- {t['role']}: {t['text'][:60]}..." for t in turns[-5:]]
        existing = _USER_SUMMARIZED_PROFILES.get(session_id, "")
        _USER_SUMMARIZED_PROFILES[session_id] = existing + "\n" + "\n".join(summary_bullets)

    async def chat_stream(
        self,
        session_id: str,
        user_message: str,
        user_profile: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream conversational responses from Saathi and yield tokens / confirmation cards."""
        # 1. Record user turn
        self.add_turn(session_id, "user", user_message)

        history = self.get_history(session_id)
        accumulated_text = []

        # 2. Call Gemini client
        async for chunk in self.client.stream_chat(
            prompt=user_message,
            history=history,
            user_profile=user_profile,
        ):
            chunk_type = chunk.get("type")

            if chunk_type == "text":
                accumulated_text.append(chunk["text"])
                yield chunk

            elif chunk_type == "tool_call":
                tool_name = chunk["tool_name"]
                tool_args = chunk["args"]
                logger.info("Companion received tool call: %s with args: %s", tool_name, tool_args)

                # Mutating actions require confirmation cards
                if tool_name in ["add_medicine", "mark_dose_taken", "create_reminder", "log_vital", "notify_family"]:
                    confirmation_card = create_confirmation_card(
                        action_type=tool_name,
                        action_payload=tool_args,
                        message=self._format_confirmation_prompt(tool_name, tool_args),
                    )
                    yield {
                        "type": "confirmation_card",
                        "card": confirmation_card,
                    }
                else:
                    # Non-mutating tools can return results directly
                    yield chunk

        # 3. Record model turn
        full_response = "".join(accumulated_text)
        if full_response:
            self.add_turn(session_id, "model", full_response)

    def _format_confirmation_prompt(self, tool_name: str, args: Dict[str, Any]) -> str:
        """Create plain-language confirmation text for senior review."""
        if tool_name == "add_medicine":
            return f"क्या आप नई दवाई '{args.get('name')} {args.get('dosage', '')}' जोड़ना चाहते हैं?"
        elif tool_name == "create_reminder":
            return f"क्या आप '{args.get('title')}' के लिए रिमाइंडर सेट करना चाहते हैं?"
        elif tool_name == "log_vital":
            if args.get("metric") == "bp":
                return f"क्या आप BP रीडिंग {args.get('value1')}/{args.get('value2')} mmHg दर्ज करना चाहते हैं?"
            return f"क्या आप {args.get('metric')} रीडिंग {args.get('value1')} दर्ज करना चाहते हैं?"
        elif tool_name == "notify_family":
            return "क्या आप अपने परिवार को यह सूचना भेजना चाहते हैं?"
        elif tool_name == "mark_dose_taken":
            return f"क्या आप '{args.get('medicine_name')}' को लिया हुआ मार्क करना चाहते हैं?"
        return "क्या आप इस कार्य की पुष्टि करते हैं?"
