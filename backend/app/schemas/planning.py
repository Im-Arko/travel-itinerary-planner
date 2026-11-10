"""Versioned planning contracts: unknown facts stay null, source IDs stay fixed."""
from datetime import date, time
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Place(Contract):
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    country: str
    country_code: str
    region: str = ""
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str = "UTC"
    label: str
    source_url: str


class StopRequest(Contract):
    place_id: int = Field(gt=0)
    days: int = Field(ge=1, le=30)


class TripRequest(Contract):
    destination_hint: str | None = Field(None, max_length=150)
    place_id: int | None = Field(None, gt=0)
    stops: list[StopRequest] = Field(default_factory=list, max_length=6)
    budget: Literal["budget", "moderate", "luxury"] | None = None
    preferred_climate: Literal["any", "tropical", "temperate", "arid", "cold", "mediterranean"] | None = None
    destination_type: Literal["any", "beach", "mountain", "city", "countryside", "adventure", "cultural"] | None = None
    trip_duration: int = Field(7, ge=1, le=30)
    travel_style: Literal["solo", "couple", "family", "group", "adventure", "cultural", "relaxation", "luxury", "budget"] | None = None
    interests: list[str] | None = Field(None, max_length=20)
    dietary_needs: str | None = Field(None, max_length=255)
    accessibility: bool | None = None
    trip_notes: str = Field("", max_length=1000)
    start_date: date | None = None
    arrival_time: time | None = None
    departure_time: time | None = None
    origin: str = Field("", max_length=150)
    travelers: int = Field(1, ge=1, le=20)
    children_ages: list[int] = Field(default_factory=list, max_length=10)
    pace: Literal["relaxed", "balanced", "active"] = "balanced"
    transport: Literal["walking", "cycling", "driving", "public_transit"] = "walking"
    currency: str = Field("USD", pattern=r"^[A-Z]{3}$")
    daily_budget: float | None = Field(None, ge=0, le=1_000_000, allow_inf_nan=False)
    planner_mode: Literal["ai", "guided"] = "ai"

    @model_validator(mode="after")
    def coherent_trip(self):
        if self.stops and sum(stop.days for stop in self.stops) != self.trip_duration:
            raise ValueError("The days at each stop must add up to the trip duration")
        if any(age < 0 or age > 17 for age in self.children_ages):
            raise ValueError("Children's ages must be between 0 and 17")
        if len(self.children_ages) >= self.travelers:
            raise ValueError("Include at least one adult in the traveler count")
        # The authoritative date check runs after resolving the destination's
        # time zone. Server-local midnight must not reject today's trip abroad.
        if any(len(interest) > 80 or not interest.strip() for interest in self.interests or []):
            raise ValueError("Interests must contain 1–80 characters")
        return self


class Attraction(Contract):
    id: str
    place_id: int
    name: str
    description: str
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    source_url: str
    image_url: str | None = None
    image_file: str | None = None
    categories: list[str] = Field(default_factory=list)
    checked_at: str
    opening_hours: str | None = None
    accessibility: str = "unknown"
    price: float | None = None


class ChoiceDay(Contract):
    day_number: int = Field(ge=1, le=30)
    attraction_ids: list[str] = Field(max_length=3)


class ChoicePlan(Contract):
    days: list[ChoiceDay] = Field(min_length=1, max_length=7)


class ActivityEdit(Contract):
    day_number: int = Field(ge=1, le=30)
    slot: Literal["morning", "afternoon", "evening"]
    note: str = Field("", max_length=1000)


class DayOrder(Contract):
    day_numbers: list[int] = Field(min_length=1, max_length=30)


class JobOut(Contract):
    request_key: str
    status: str
    phase: str
    itinerary_id: int | None = None
    error: str | None = None
    error_code: int | None = None
