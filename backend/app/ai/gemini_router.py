"""Gemini Query Intent Router.

Routes user queries to either:
1. Google Search Grounding: For factual, live news, government schemes, or weather questions.
2. Function Calling: For internal app actions (medicines, reminders, vitals, scam scans, tutorial).
3. Conversational: For general empathetic companionship, memories, recipes, and emotional support.

Enforces Requirement 7: Never combines Search Grounding and Function Declarations in one call.
"""

from enum import Enum
import re


class QueryIntent(str, Enum):
    GROUNDED_SEARCH = "grounded_search"
    ACTION_TOOLS = "action_tools"
    CONVERSATIONAL = "conversational"


# Grounding trigger patterns (Schemes, live current affairs, news, public rules)
GROUNDING_PATTERNS = [
    r"\b(yojana|scheme|sarkari|government|pm|narendra modi|ayushman|pension|vaya vandana)\b",
    r"\b(weather|mausam|barish|temperature|rain|humidity)\b",
    r"\b(news|khabar|samachar|headline|today's news|aaj ka)\b",
    r"\b(rules|eligibility|age limit|interest rate|bank interest|fd rate)\b",
    r"\b(who is|what is the current|latest|recent)\b",
]

# Action tool trigger patterns (Meds, reminders, vitals, scam check, tutorial, family)
ACTION_PATTERNS = [
    r"\b(dawai|medicine|tablet|goli|dose|khayi|li|prescription)\b",
    r"\b(bp|blood pressure|sugar|glucose|pulse|nabz|vital|reading)\b",
    r"\b(reminder|yaad|alarm|alert|schedule|appointment)\b",
    r"\b(scam|fraud|dhokha|lottery|suspicious|sms|link|fake|kyc)\b",
    r"\b(bill|bijli|electricity|document|kaghaz|parcha)\b",
    r"\b(family|beta|beti|bacche|pariwar|sos|emergency|112)\b",
    r"\b(tutorial|seekhna|kaise karein|how to|shikhao|step|upi|whatsapp)\b",
]


def classify_query_intent(prompt: str) -> QueryIntent:
    """Determine the optimal execution routing for a given user query."""
    text = prompt.lower().strip()

    # 1. Check for action/tool commands first (highest priority)
    for pattern in ACTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return QueryIntent.ACTION_TOOLS

    # 2. Check for real-time/factual/grounding triggers
    for pattern in GROUNDING_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return QueryIntent.GROUNDED_SEARCH

    # 3. Default to empathetic open conversation
    return QueryIntent.CONVERSATIONAL
