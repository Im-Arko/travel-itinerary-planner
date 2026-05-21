from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores/hyphens allowed)")
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Preferences ───────────────────────────────────────────────────────────────

class PreferenceUpsert(BaseModel):
    budget: str = "moderate"
    preferred_climate: str = "any"
    destination_type: str = "any"
    trip_duration: int = Field(7, ge=1, le=30)
    travel_style: str = "solo"
    interests: List[str] = Field(default_factory=list)
    dietary_needs: Optional[str] = None
    accessibility: bool = False


class PreferenceOut(PreferenceUpsert):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Destinations ──────────────────────────────────────────────────────────────

class DestinationOut(BaseModel):
    id: int
    name: str
    country: str
    continent: Optional[str]
    description: str
    climate_type: str
    destination_type: str
    budget_level: str
    best_months: Optional[str]
    avg_temp_c: Optional[float]
    tags: Optional[str]
    image_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]

    model_config = {"from_attributes": True}


class DestinationSearchResult(BaseModel):
    destination: DestinationOut
    similarity_score: float
    match_reason: str


class IngestRequest(BaseModel):
    destination_ids: Optional[List[int]] = None


class IngestResponse(BaseModel):
    ingested: int
    message: str


# ── Itineraries ───────────────────────────────────────────────────────────────

class DayPlan(BaseModel):
    day_number: int
    theme: str
    morning: str
    afternoon: str
    evening: str
    accommodation: Optional[str] = None
    estimated_cost: Optional[float] = None
    tips: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ItineraryGenerateRequest(BaseModel):
    budget: str
    preferred_climate: Optional[str] = "any"
    destination_type: Optional[str] = "any"
    trip_duration: int = Field(7, ge=1, le=30)
    travel_style: Optional[str] = "solo"
    interests: Optional[List[str]] = Field(default_factory=list)
    destination_hint: Optional[str] = None


class ItineraryOut(BaseModel):
    id: int
    user_id: int
    destination_id: Optional[int]
    title: str
    destination_name: str
    duration_days: int
    budget: str
    travel_style: Optional[str]
    summary: Optional[str]
    full_itinerary: str
    status: str
    is_favorite: bool
    rating: Optional[int]
    user_notes: Optional[str]
    generated_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItineraryWithDays(ItineraryOut):
    days: List[DayPlan] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ItineraryUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    is_favorite: Optional[bool] = None
    rating: Optional[int] = None
    user_notes: Optional[str] = None
