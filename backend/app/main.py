"""Aoun voice-tools service.

Run:  uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import admin, demo, doctor, location, ministry, patient, tools, webhooks
from .config import Settings, load_settings
from .db import Database, seed_demo
from .security import PhoneVault

# Log only method, path and status: never bodies, tokens or phone numbers.
log = logging.getLogger("aoun")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="Aoun voice tools", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = settings
    app.state.vault = PhoneVault(settings.phone_enc_key)
    app.state.db = Database(settings.db_path)
    seed_demo(app.state.db, app.state.vault)  # also seeds open times, doctors and past records

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        if not request.url.path.startswith("/app/assets/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        path = request.url.path
        if path.startswith("/l/"):
            path = "/l/<code>"  # the one-time location code never reaches the logs
        elif path.startswith("/f/"):
            path = "/f/<code>"
        log.info("%s %s %s", request.method, path, response.status_code)
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request: Request, exc: RequestValidationError):
        # Say which field was wrong, but never echo the submitted values back.
        fields = sorted({".".join(str(p) for p in e["loc"][1:]) for e in exc.errors()})
        return JSONResponse(status_code=422, content={"detail": "invalid_input", "fields": fields})

    @app.get("/health")
    def health():
        return {"ok": True}

    app.include_router(tools.router)
    app.include_router(admin.router)
    app.include_router(webhooks.router)
    app.include_router(ministry.router)
    app.include_router(location.router)
    app.include_router(demo.router)
    app.include_router(patient.router)
    app.include_router(patient.files_router)
    app.include_router(doctor.router)
    return app

