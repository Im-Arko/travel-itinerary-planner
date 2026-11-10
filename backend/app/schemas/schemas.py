from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict, PlainSerializer
from typing import Optional, List, Any, Literal, Annotated
from datetime import datetime, timezone

UTCDateTime = Annotated[datetime, PlainSerializer(lambda value: (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat(), return_type=str, when_used="json")]

Budget = Literal["budget", "moderate", "luxury"]
Climate = Literal["any", "tropical", "temperate", "arid", "cold", "mediterranean"]
DestinationType = Literal["any", "beach", "mountain", "city", "countryside", "adventure", "cultural"]
TravelStyle = Literal["solo", "couple", "family", "group", "adventure", "cultural", "relaxation", "luxury", "budget"]
ItineraryStatus = Literal["draft", "saved", "archived"]
Interest = Annotated[str, Field(min_length=1, max_length=80)]


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    password: str = Field(min_length=12, max_length=128, repr=False)
    full_name: Optional[str] = Field(None, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return value.lower()

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores/hyphens allowed)")
        return v.lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128, repr=False)


class AccountDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(min_length=1, max_length=128, repr=False)


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
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


# ── Preferences ───────────────────────────────────────────────────────────────

class PreferenceDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    destinationHint: str = Field("", max_length=150)
    tripNotes: str = Field("", max_length=1000)


class PreferenceUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")
    budget: Budget = "moderate"
    preferred_climate: Climate = "any"
    destination_type: DestinationType = "any"
    trip_duration: int = Field(7, ge=1, le=30)
    travel_style: TravelStyle = "solo"
    interests: List[Interest] = Field(default_factory=list, max_length=20)
    dietary_needs: Optional[str] = Field(None, max_length=255)
    accessibility: bool = False
    planning_details: PreferenceDetails = Field(default_factory=PreferenceDetails)


class PreferenceOut(PreferenceUpsert):
    id: int
    user_id: int
    created_at: UTCDateTime
    updated_at: UTCDateTime

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
    model_config = ConfigDict(extra="forbid")
    destination_ids: Optional[List[Annotated[int, Field(gt=0)]]] = Field(None, max_length=500)


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
    date: Optional[str] = None
    activities: list[dict] = Field(default_factory=list)
    travel_legs: list[dict] = Field(default_factory=list)
    user_note: str = ""
    place: dict | None = None
    user_edited_slots: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ItinerarySummary(BaseModel):
    id: int
    user_id: int
    destination_id: Optional[int]
    title: str
    destination_name: str
    duration_days: int
    budget: str
    travel_style: Optional[str]
    summary: Optional[str]
    status: str
    is_favorite: bool
    rating: Optional[int]
    user_notes: Optional[str]
    generated_at: UTCDateTime
    updated_at: UTCDateTime
    image_url: str | None = None

    model_config = {"from_attributes": True}


class ItineraryOut(ItinerarySummary):
    full_itinerary: str
    plan: dict = Field(default_factory=dict)


class ItineraryWithDays(ItineraryOut):
    days: List[DayPlan] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ItineraryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[ItineraryStatus] = None
    is_favorite: Optional[bool] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    user_notes: Optional[str] = Field(None, max_length=10000)
