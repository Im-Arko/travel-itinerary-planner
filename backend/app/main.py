"""
Travel Itinerary API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FastAPI backend with LangChain + ChromaDB for personalised
AI-generated travel itineraries.
"""
print("STARTING MAIN")

from fastapi import FastAPI, Depends
print("FASTAPI IMPORTED")

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import get_settings
from .database.session import get_db, engine
from .database.models import User, Base
from .services.auth_service import get_current_user, oauth2

# Routers
from .routers import auth, preferences, destinations, itineraries

settings = get_settings()

# Create database tables
#Base.metadata.create_all(bind=engine)
# ── App ────────────────────────────────────────────────────────

app = FastAPI(
    title        = "🌍 Travel Itinerary API",
    description  = """
## AI-Powered Personalised Travel Itinerary Generator

This API combines **semantic vector search** (ChromaDB + Sentence Transformers)
with **LLM generation** (LangChain + OpenAI) to create personalised, day-wise
travel itineraries based on your preferences.

### Key Features
- 🔐 JWT-based authentication (access + refresh tokens)
- 🗺️ Destination knowledge base with 10+ global destinations
- 🔍 Semantic similarity search powered by ChromaDB
- 🤖 GPT-4o-mini generated personalised itineraries
- 📚 Full itinerary history with favourites and ratings

### Quick Start
1. **Register** → `POST /api/auth/register`
2. **Ingest destinations** → `POST /api/destinations/ingest`
3. **Save preferences** → `POST /api/preferences`
4. **Generate itinerary** → `POST /api/itineraries/generate`
""",
    version      = "1.0.0",
    contact      = {"name": "Travel App Team"},
    swagger_ui_parameters={"docExpansion": "none"},
)
print("APP CREATED")

# ── CORS ────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travellant-front.onrender.com"
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Dependency override: inject db into get_current_user ───────

def get_current_user_with_db(
    token: str      = Depends(oauth2),
    db:    Session  = Depends(get_db),
) -> User:
    return get_current_user(token=token, db=db)

app.dependency_overrides[get_current_user] = get_current_user_with_db

# ── Routers ─────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(destinations.router)
app.include_router(itineraries.router)


# ── Health check ───────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="Health check endpoint")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["System"], summary="API root")
def root():
    return {
        "message": "🌍 Travel Itinerary API",
        "docs":    "/docs",
        "redoc":   "/redoc",
    }
print("ROUTES REGISTERED")

# ── Startup ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.getLogger(__name__).info("Travel Itinerary API started")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
