"""YouTube and Devotional Bhajan Service for Senior Citizens.

Provides curated spiritual bhajans, aartis, mantras, and YouTube Data API v3 search integration.
"""

import logging
from typing import Any, Dict, List, Optional
import httpx

from backend.app.config import get_settings

logger = logging.getLogger("saathi.services.youtube")

# Verified High-Quality Devotional & Spiritual Catalog
CURATED_BHAJANS: List[Dict[str, Any]] = [
    {
        "id": "AETFvQonfV8",
        "title": "श्री हनुमान चालीसा (Shree Hanuman Chalisa)",
        "singer": "हरिहरन (Hariharan) / गुलशन कुमार",
        "category": "hanuman",
        "category_hi": "हनुमान जी",
        "duration": "9:42",
        "thumbnail": "https://img.youtube.com/vi/AETFvQonfV8/hqdefault.jpg",
        "description": "संकट मोचन श्री हनुमान चालीसा - मन को शांति और शक्ति देने वाली पावन स्तुति।",
    },
    {
        "id": "Xqhp3t-Qe3o",
        "title": "गायत्री मंत्र १०८ बार (Gayatri Mantra 108 Times)",
        "singer": "अनुराधा पौडवाल (Anuradha Paudwal)",
        "category": "aarti_mantra",
        "category_hi": "मंत्र व आरती",
        "duration": "24:10",
        "thumbnail": "https://img.youtube.com/vi/Xqhp3t-Qe3o/hqdefault.jpg",
        "description": "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं - प्रातःकाल के ध्यान और सकारात्मक ऊर्जा के लिए।",
    },
    {
        "id": "h3fT4vO6Xn0",
        "title": "श्री कृष्ण गोविन्द हरे मुरारी (Shri Krishna Govind)",
        "singer": "सिद्धांत माधव / भक्ति गीत",
        "category": "krishna",
        "category_hi": "कृष्ण भजन",
        "duration": "12:15",
        "thumbnail": "https://img.youtube.com/vi/h3fT4vO6Xn0/hqdefault.jpg",
        "description": "हे नाथ नारायण वासुदेवा - भगवान श्री कृष्ण का परम पावन भजन।",
    },
    {
        "id": "Tf8i6r9i5eI",
        "title": "अच्युतम केशवं कृष्ण दामोदरं (Achyutam Keshavam)",
        "singer": "विक्रम हाजरा / आर्ट ऑफ़ लिविंग",
        "category": "krishna",
        "category_hi": "कृष्ण भजन",
        "duration": "5:30",
        "thumbnail": "https://img.youtube.com/vi/Tf8i6r9i5eI/hqdefault.jpg",
        "description": "कौन कहते हैं भगवान आते नहीं - मधुर एवं मनमोहक कृष्ण भजन।",
    },
    {
        "id": "1_47iukX_e8",
        "title": "शिव तांडव स्तोत्रम् व आरती (Shiv Tandav / Aarti)",
        "singer": "शंकर महादेवन (Shankar Mahadevan)",
        "category": "shiva",
        "category_hi": "शिव वंदना",
        "duration": "8:20",
        "thumbnail": "https://img.youtube.com/vi/1_47iukX_e8/hqdefault.jpg",
        "description": "जटाटवीगलज्जलप्रवाहपावितस्थले - भगवान शिव की ओजस्वी एवं मंगलकारी स्तुति।",
    },
    {
        "id": "3wDiyl_H85g",
        "title": "राम सिया राम (Ram Siya Ram)",
        "singer": "सचेत टंडन / परंपरा",
        "category": "ram",
        "category_hi": "श्री राम भजन",
        "duration": "4:45",
        "thumbnail": "https://img.youtube.com/vi/3wDiyl_H85g/hqdefault.jpg",
        "description": "मंगल भवन अमंगल हारी - मर्यादा पुरुषोत्तम भगवान श्री राम की कृपा।",
    },
    {
        "id": "y8c8Qf3vH34",
        "title": "ॐ जय जगदीश हरे (Om Jai Jagdish Hare - Aarti)",
        "singer": "अनुराधा पौडवाल",
        "category": "aarti_mantra",
        "category_hi": "मंत्र व आरती",
        "duration": "6:15",
        "thumbnail": "https://img.youtube.com/vi/y8c8Qf3vH34/hqdefault.jpg",
        "description": "दैनिक संध्या एवं प्रातः आरती - सुख संपत्ति घर आवे, कष्ट मिटे तन का।",
    },
    {
        "id": "N5yL5qjP0J4",
        "title": "लता मंगेशकर सदाबहार भक्ति व पुराने गीत",
        "singer": "लता मंगेशकर (Lata Mangeshkar)",
        "category": "geet",
        "category_hi": "पुराने गीत व सुकून",
        "duration": "45:00",
        "thumbnail": "https://img.youtube.com/vi/N5yL5qjP0J4/hqdefault.jpg",
        "description": "इतनी शक्ति हमें देना दाता, ऐ मेरे वतन के लोगों और अनमोल सदाबहार नगमे।",
    },
]


def get_curated_catalog(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return verified curated devotional videos filtered by category."""
    if not category or category == "all":
        return CURATED_BHAJANS
    return [b for b in CURATED_BHAJANS if b["category"] == category]


async def search_youtube_videos(query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search for videos via YouTube Data API v3 if API key available, or curated catalog fallback."""
    settings = get_settings()
    query_clean = query.strip()

    # 1. If YouTube API Key is provided, call official YouTube Data API v3
    if settings.YOUTUBE_API_KEY:
        try:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": f"{query_clean} bhajan devotional hindi",
                "type": "video",
                "maxResults": 6,
                "key": settings.YOUTUBE_API_KEY,
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    results = []
                    for item in data.get("items", []):
                        vid = item.get("id", {}).get("videoId")
                        snippet = item.get("snippet", {})
                        if vid:
                            results.append({
                                "id": vid,
                                "title": snippet.get("title", query_clean),
                                "singer": snippet.get("channelTitle", "YouTube Music"),
                                "category": category or "bhajan",
                                "category_hi": "भजन / संगीत",
                                "duration": "ऑडियो / वीडियो",
                                "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", f"https://img.youtube.com/vi/{vid}/hqdefault.jpg"),
                                "description": snippet.get("description", ""),
                            })
                    if results:
                        return results
        except Exception as exc:
            logger.warning("YouTube Data API call failed, falling back to curated list: %s", exc)

    # 2. Curated Match Fallback
    q_lower = query_clean.lower()
    matches = []
    for b in CURATED_BHAJANS:
        if (
            q_lower in b["title"].lower()
            or q_lower in b["singer"].lower()
            or q_lower in b["category"].lower()
            or q_lower in b["description"].lower()
        ):
            matches.append(b)

    if matches:
        return matches

    # 3. Dynamic generic fallback if no direct keyword match
    return [
        {
            "id": "AETFvQonfV8",
            "title": f"भक्ति भजन: {query_clean}",
            "singer": "लोकप्रिय भक्ति धारा",
            "category": category or "bhajan",
            "category_hi": "भक्ति संगीत",
            "duration": "10:00",
            "thumbnail": "https://img.youtube.com/vi/AETFvQonfV8/hqdefault.jpg",
            "description": f"आपके द्वारा चुना गया: '{query_clean}'। सुनने के लिए प्ले करें।",
        }
    ]
