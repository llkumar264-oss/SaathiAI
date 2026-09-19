"""Security Headers Middleware."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies strict enterprise security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Enforce modern security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Permissions policy: audio and geolocation allowed for self (mic for voice chat, geo for SOS)
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=(self)"

        # Content Security Policy (allows Google Fonts, Web Speech, and own domain)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none';"
        )

        return response
