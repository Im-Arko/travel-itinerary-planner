"""
LLM Service
──────────────────────────────────────────────────────────────
Uses OpenAI to generate personalised day-wise travel itineraries
based on user preferences and matched destinations.
"""

import json
import logging
from typing import List, Optional

import openai
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Output schema for structured LLM response ─────────────────

class DayPlanLLM(BaseModel):
    day_number:     int
    theme:          str    = Field(description="Short evocative theme for the day")
    morning:        str    = Field(description="Morning activities and recommendations")
    afternoon:      str    = Field(description="Afternoon activities and recommendations")
    evening:        str    = Field(description="Evening activities, dining, and nightlife")
    accommodation:  str    = Field(description="Recommended accommodation type or name")
    estimated_cost: float  = Field(description="Estimated total daily spend in USD")
    tips:           str    = Field(description="Insider tips or practical advice for the day")

class ItineraryLLM(BaseModel):
    title:            str            = Field(description="Creative itinerary title")
    destination_name: str
    summary:          str            = Field(description="2-3 sentence overview of the trip")
    days:             List[DayPlanLLM]
    total_budget_est: float          = Field(description="Total estimated budget in USD")
    best_time_to_go:  str
    packing_tips:     List[str]      = Field(description="5 essential packing tips")


# ── Prompt templates ───────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert travel planner with deep knowledge of global destinations.
Generate detailed, practical, and inspiring travel itineraries tailored to the traveller's preferences.
Always respond with valid JSON matching the requested schema. Be specific with activity names, restaurant
recommendations, and accommodation types. Costs should be realistic for the destination and budget level."""

ITINERARY_PROMPT = """Create a personalised {duration}-day travel itinerary for {destination}.

TRAVELLER PROFILE:
- Budget level: {budget} (budget=<$100/day, moderate=$100-300/day, luxury=$300+/day)
- Travel style: {travel_style}
- Climate preference: {climate}
- Destination type preference: {dest_type}
- Interests: {interests}
- Dietary needs: {dietary}
- Accessibility requirements: {accessibility}

DESTINATION CONTEXT:
{dest_context}

Generate a complete day-by-day itinerary with morning, afternoon and evening plans.
Be specific about place names, restaurants, and activity costs.
Return the itinerary as a valid JSON object matching this schema:
{format_instructions}"""


# ── OpenAI helpers ─────────────────────────────────────────────

def _configure_openai() -> None:
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Set it in .env or the environment and restart the backend."
        )
    openai.api_key = settings.openai_api_key


# ── Main generation function ───────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_itinerary(
    destination:   str,
    duration:      int,
    budget:        str,
    travel_style:  str,
    climate:       str       = "any",
    dest_type:     str       = "any",
    interests:     List[str] = None,
    dietary:       str       = None,
    accessibility: bool      = False,
    dest_context:  str       = "",
) -> dict:
    """
    Call OpenAI to generate a structured itinerary.
    Returns a dict with keys matching ItineraryLLM schema.
    """
    _configure_openai()

    prompt_text = ITINERARY_PROMPT.format(
        destination     = destination,
        duration        = duration,
        budget          = budget,
        travel_style    = travel_style,
        climate         = climate,
        dest_type       = dest_type,
        interests       = ", ".join(interests) if interests else "general sightseeing",
        dietary         = dietary or "none",
        accessibility   = "yes - please ensure activities are accessible" if accessibility else "no",
        dest_context    = dest_context or f"{destination} is a wonderful travel destination.",
        format_instructions = json.dumps({
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "destination_name": {"type": "string"},
                "summary": {"type": "string"},
                "total_budget_est": {"type": "number"},
                "best_time_to_go": {"type": "string"},
                "packing_tips": {"type": "array", "items": {"type": "string"}},
                "days": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "day_number": {"type": "integer"},
                            "theme": {"type": "string"},
                            "morning": {"type": "string"},
                            "afternoon": {"type": "string"},
                            "evening": {"type": "string"},
                            "accommodation": {"type": "string"},
                            "estimated_cost": {"type": "number"},
                            "tips": {"type": "string"},
                        },
                        "required": ["day_number", "theme", "morning", "afternoon", "evening", "accommodation", "estimated_cost", "tips"],
                    },
                },
            },
            "required": ["title", "destination_name", "summary", "total_budget_est", "best_time_to_go", "packing_tips", "days"],
        }),
    )

    logger.info("Generating itinerary for %s (%d days, %s budget)", destination, duration, budget)
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt_text},
            ],
            temperature=0.7,
            max_tokens=1500,
        )
    except Exception as exc:
        logger.exception("OpenAI request failed")
        raise RuntimeError(f"OpenAI request failed: {exc}") from exc

    # Try to robustly extract the assistant content
    try:
        # Support mapping-like and attribute-style responses
        if hasattr(response, "choices"):
            choices = response.choices
        else:
            choices = response.get("choices", [])
        if not choices:
            raise ValueError("no choices returned from OpenAI")
        first = choices[0]
        # try attribute access then dict access
        if hasattr(first, "message"):
            raw = first.message.get("content") if isinstance(first.message, dict) else getattr(first.message, "content", None)
        else:
            raw = first.get("message", {}).get("content")
        if raw is None:
            # older OpenAI responses might put text in 'text' or 'content'
            raw = getattr(first, "text", None) or first.get("text") if isinstance(first, dict) else None
        if raw is None:
            raise ValueError("could not extract assistant content from OpenAI response")
        raw = raw.strip()
    except Exception as exc:
        logger.exception("Failed to extract content from OpenAI response: %s", exc)
        raise RuntimeError(f"Failed to extract OpenAI response content: {exc}") from exc

    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    try:
        parsed = json.loads(raw)
    except Exception as exc:
        logger.exception("Failed to parse JSON from LLM output: %s", exc)
        raise ValueError(f"LLM returned invalid JSON: {exc}\nRAW:\n{raw}") from exc

    # Validate schema and return plain dict
    itinerary = ItineraryLLM.model_validate(parsed)
    return itinerary.model_dump()


def generate_destination_summary(dest_context: str, preferences: dict) -> str:
    """Generate a short 'why this destination suits you' explanation."""
    _configure_openai()

    prompt = (
        f"Given this traveller profile: {json.dumps(preferences)}\n"
        f"And this destination: {dest_context}\n"
        "Write 2 sentences explaining why this destination is a great match. Be specific and enthusiastic."
    )

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    return response.choices[0].message["content"].strip()
