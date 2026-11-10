"""Travel itinerary API."""
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from .database.models import Base
from .database.session import engine
from .config import get_settings
from .security import RequestProtection
from .routers import auth, preferences, destinations, itineraries, planning
from .services import ai_planner

settings = get_settings()
app = FastAPI(
    title="Travel Itinerary API", version="2.0.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None, openapi_url="/openapi.json" if settings.app_env != "production" else None,
)
app.add_middleware(RequestProtection)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    # Pydantic errors contain the original input, including submitted passwords.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]})


@app.exception_handler(Exception)
async def internal_error(request: Request, exc: Exception):
    logging.getLogger(__name__).error("Unhandled API error (%s)", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "An internal error occurred"})


app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(destinations.router)
app.include_router(itineraries.router)
app.include_router(planning.router)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}


@app.get("/ready", tags=["System"])
def ready():
    try:
        with engine.connect() as connection:
            # Check the required schema and read access without returning records.
            for table in Base.metadata.sorted_tables:
                connection.execute(select(table).limit(0))
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "unavailable"})
    ai_configured = ai_planner.available()
    if settings.app_env == "production" and not ai_configured:
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "available", "ai": "not_configured"})
    return {"status": "ok", "database": "available", "ai": "configured" if ai_configured else "not_configured", "guided": "available"}


@app.get("/", tags=["System"])
def root():
    return {"message": "Travel Itinerary API"}
