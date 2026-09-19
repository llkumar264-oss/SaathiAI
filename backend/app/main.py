"""FastAPI Main Application for SaathiAI."""

import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.config import get_settings
from backend.app.security.headers import SecurityHeadersMiddleware
from backend.app.security.rate_limiter import limiter
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.guest import router as guest_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.chat import router as chat_router
from backend.app.api.routes.medicines import router as medicines_router
from backend.app.api.routes.scam import router as scam_router
from backend.app.api.routes.documents import router as documents_router
from backend.app.api.routes.morning_brief import router as morning_brief_router
from backend.app.api.routes.vitals import router as vitals_router
from backend.app.api.routes.tutor import router as tutor_router
from backend.app.api.routes.family import router as family_router
from backend.app.api.routes.youtube import router as youtube_router

# Configure structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("saathi.main")


def create_app() -> FastAPI:
    """Application factory for SaathiAI."""
    settings = get_settings()

    # Critical Security Check on Startup:
    # If ENVIRONMENT is prod and ALLOW_DEV_TOKENS is enabled, refuse to run!
    if settings.ENVIRONMENT.lower() == "prod" and settings.ALLOW_DEV_TOKENS:
        raise RuntimeError("CRITICAL ERROR: ALLOW_DEV_TOKENS cannot be enabled when ENVIRONMENT=prod")

    app = FastAPI(
        title="SaathiAI API",
        description="Daily Companion AI for Senior Citizens",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT != "prod" else None,
        redoc_url=None,
    )

    # Attach Rate Limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Attach Security Headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Attach CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(health_router)
    app.include_router(guest_router)
    app.include_router(auth_router)
    app.include_router(chat_router)
    app.include_router(medicines_router)
    app.include_router(scam_router)
    app.include_router(documents_router)
    app.include_router(morning_brief_router)
    app.include_router(vitals_router)
    app.include_router(tutor_router)
    app.include_router(family_router)
    app.include_router(youtube_router)

    # Static File Serving for Single-Container React Frontend
    static_dirs = [
        Path(__file__).parent.parent / "static",
        Path(__file__).parent.parent.parent / "frontend" / "dist",
    ]
    
    static_dir = None
    for candidate in static_dirs:
        if candidate.exists() and (candidate / "index.html").exists():
            static_dir = candidate
            break

    if static_dir:
        logger.info("Serving static frontend from: %s", static_dir)
        assets_dir = static_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            # API requests should not fall through to SPA
            if full_path.startswith("api/") or full_path == "health":
                return JSONResponse({"detail": "Not Found"}, status_code=404)
            file_path = static_dir / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(static_dir / "index.html")

    return app


app = create_app()
