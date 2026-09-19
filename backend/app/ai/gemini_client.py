"""Gemini API Client using the official google-genai SDK.

Features:
- Dynamic model selection via GEMINI_MODEL env variable
- Intent routing: separate Search Grounding and Function Declarations
- Deterministic fixture mock mode (GEMINI_MOCK=True) for offline testing & CI
- Streaming SSE generation
- Persona system prompt loading from saathi.md
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from backend.app.config import Settings, get_settings
from backend.app.ai.gemini_router import QueryIntent, classify_query_intent
from backend.app.ai.tools import TOOL_DECLARATIONS

logger = logging.getLogger("saathi.ai.gemini")

# Cache persona prompt
_PERSONA_PROMPT: Optional[str] = None


def get_persona_prompt() -> str:
    """Read persona system prompt from saathi.md."""
    global _PERSONA_PROMPT
    if _PERSONA_PROMPT is None:
        prompt_path = Path(__file__).parent.parent / "prompts" / "saathi.md"
        if prompt_path.exists():
            _PERSONA_PROMPT = prompt_path.read_text(encoding="utf-8")
        else:
            _PERSONA_PROMPT = "You are Saathi, a warm and respectful companion for seniors in India."
    return _PERSONA_PROMPT


class GeminiClient:
    """Gemini Client encapsulating live SDK calls and deterministic test fixtures."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.persona = get_persona_prompt()
        self._live_client = None

        if not self.settings.GEMINI_MOCK and self.settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._live_client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
                logger.info("Live Google GenAI Client initialized with model: %s", self.settings.GEMINI_MODEL)
            except Exception as e:
                logger.warning("Could not initialize google-genai client, falling back to mock mode: %s", e)

    @property
    def mock_mode(self) -> bool:
        """Whether client is operating in deterministic mock/test mode."""
        return self.settings.GEMINI_MOCK or self._live_client is None

    async def generate_text(self, prompt: str) -> str:
        """Generate single complete text response from Gemini (or deterministic mock)."""
        if self.mock_mode:
            return "चिंता मत कीजिए शर्मा जी! स्क्रीन के बीच में दिए गए बटन पर हल्के से टैप करें।"

        try:
            res = await self._live_client.aio.models.generate_content(
                model=self.settings.GEMINI_MODEL,
                contents=prompt,
            )
            return res.text or ""
        except Exception as exc:
            logger.error("Live generate_text failed: %s", exc)
            return "चिंता मत कीजिए शर्मा जी! स्क्रीन के बीच में दिए गए बटन पर हल्के से टैप करें।"

    async def stream_chat(
        self,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        user_profile: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat tokens or tool invocations via Server-Sent Events (SSE)."""
        intent = classify_query_intent(prompt)
        logger.info("Routing prompt: '%s...' with intent: %s", prompt[:30], intent)

        # 1. Deterministic Mock Mode for CI / Offline Testing
        if self.settings.GEMINI_MOCK or self._live_client is None:
            async for chunk in self._mock_stream_response(prompt, intent):
                yield chunk
            return

        # 2. Live Gemini Execution using official google-genai SDK
        from google.genai import types

        # Prepare messages and system instruction
        system_instruction = self.persona
        if user_profile:
            name = user_profile.get("display_name", "Sharma Ji")
            lang = user_profile.get("preferred_language", "hi")
            system_instruction += f"\nUser Profile: Name: {name}, Language: {lang}."

        try:
            config_params: Dict[str, Any] = {
                "system_instruction": system_instruction,
                "temperature": 0.7,
            }

            if intent == QueryIntent.ACTION_TOOLS:
                # Function calling without search grounding
                config_params["tools"] = [
                    types.Tool(function_declarations=TOOL_DECLARATIONS)
                ]
            elif intent == QueryIntent.GROUNDED_SEARCH:
                # Grounded search without function declarations
                config_params["tools"] = [
                    types.Tool(google_search=types.GoogleSearch())
                ]

            config = types.GenerateContentConfig(**config_params)

            # Use async client generate_content_stream
            response_stream = await self._live_client.aio.models.generate_content_stream(
                model=self.settings.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )

            async for chunk in response_stream:
                # Check for function calls
                if chunk.function_calls:
                    for fc in chunk.function_calls:
                        yield {
                            "type": "tool_call",
                            "tool_name": fc.name,
                            "args": fc.args,
                        }
                # Check for grounded search sources
                sources = []
                if hasattr(chunk, "candidates") and chunk.candidates:
                    first_cand = chunk.candidates[0]
                    if hasattr(first_cand, "grounding_metadata") and first_cand.grounding_metadata:
                        chunks = getattr(first_cand.grounding_metadata, "grounding_chunks", [])
                        for gc in chunks:
                            if hasattr(gc, "web") and gc.web:
                                sources.append({"title": gc.web.title, "url": gc.web.uri})

                if chunk.text:
                    yield {
                        "type": "text",
                        "text": chunk.text,
                        "sources": sources if sources else None,
                    }

        except Exception as err:
            logger.error("Error in live Gemini streaming: %s", err)
            # Friendly fallback message as per prompt specifications
            yield {
                "type": "text",
                "text": "नमस्ते शर्मा जी, संपर्क में थोड़ी रुकावट आई है। क्या आप एक बार फिर कह सकते हैं?",
                "sources": None,
            }

    async def _mock_stream_response(
        self, prompt: str, intent: QueryIntent
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Provide deterministic fixture responses for tests and offline development."""
        await asyncio.sleep(0.05)
        lower = prompt.lower()

        # Action: Log Vitals (BP / Sugar)
        if "bp" in lower or "blood pressure" in lower:
            # Parse simple mock values or defaults
            yield {
                "type": "tool_call",
                "tool_name": "log_vital",
                "args": {
                    "metric": "bp",
                    "value1": 140.0,
                    "value2": 90.0,
                    "context": "random",
                    "notes": "Voice reading",
                },
            }
            yield {
                "type": "text",
                "text": "मैंने आपका रक्तचाप (BP 140/90 mmHg) दर्ज करने के लिए कार्ड तैयार कर दिया है। क्या मैं इसे सुरक्षित कर दूँ?",
            }
            return

        # Action: Reminder
        if "reminder" in lower or "yaad" in lower or "appointment" in lower:
            yield {
                "type": "tool_call",
                "tool_name": "create_reminder",
                "args": {
                    "title": "डॉक्टर का अपॉइंटमेंट (Doctor Visit)",
                    "datetime_str": "2026-09-20 09:00",
                    "category": "appointment",
                },
            }
            yield {
                "type": "text",
                "text": "मैंने कल सुबह 9:00 बजे डॉक्टर के अपॉइंटमेंट का रिमाइंडर तैयार कर दिया है। पुष्टि के लिए 'Confirm' बटन दबाएं।",
            }
            return

        # Action: Scam check
        if "scam" in lower or "fraud" in lower or "kyc" in lower or "bijli" in lower:
            yield {
                "type": "tool_call",
                "tool_name": "check_message_for_scam",
                "args": {
                    "message_text": prompt,
                },
            }
            yield {
                "type": "text",
                "text": "मैं इस संदेश की तुरंत धोखाधड़ी जांच (Scam Shield) कर रहा हूँ...",
            }
            return

        # Action: YouTube Bhajan / Devotional video
        if any(w in lower for w in ["bhajan", "aarti", "chalisa", "youtube", "gana", "geet", "mantra", "pravachan", "kirtan"]):
            yield {
                "type": "tool_call",
                "tool_name": "play_youtube_video",
                "args": {
                    "query": prompt,
                    "category": "bhajan",
                },
            }
            yield {
                "type": "text",
                "text": "मैंने आपके लिए पावन भजन खोज लिया है। आप नीचे दिए गए प्लेयर पर टैप करके सुन सकते हैं।",
            }
            return

        # Grounding: Schemes / Weather
        if intent == QueryIntent.GROUNDED_SEARCH:
            yield {
                "type": "text",
                "text": "प्रधानमंत्री वय वंदना योजना (PMVVY) वरिष्ठ नागरिकों (60 वर्ष और अधिक) के लिए एक सरकारी पेंशन योजना है। इसमें गारंटीकृत ब्याज दर मिलती है।",
                "sources": [
                    {"title": "LIC PMVVY Official Scheme Portal", "url": "https://licindia.in"},
                    {"title": "PIB Senior Citizen Schemes", "url": "https://pib.gov.in"},
                ],
            }
            return

        # Default Conversational greeting
        yield {
            "type": "text",
            "text": "नमस्ते शर्मा जी! मैं आपका साथी हूँ। आप आज कैसा महसूस कर रहे हैं? क्या आज की दवाइयों या किसी अन्य विषय पर बात करनी है?",
        }
