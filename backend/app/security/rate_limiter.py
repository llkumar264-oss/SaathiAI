"""Rate limiter configuration using SlowAPI."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_rate_limit_key(request: Request) -> str:
    """Determine rate limit key by authenticated UID or fallback to IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        if token:
            return f"uid:{token[:32]}"
    return get_remote_address(request)


# Global Limiter instance
limiter = Limiter(key_func=get_rate_limit_key)
