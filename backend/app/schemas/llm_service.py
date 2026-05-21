"""
LLM Service
──────────────────────────────────────────────────────────────
Uses OpenAI to generate personalised day-wise travel itineraries
based on user preferences and matched destinations.

NOTE: This service currently uses a MOCK implementation for testing.
To use real OpenAI, set USE_MOCK_LLM=false in .env and provide a valid
OPENAI_API_KEY.
──────────────────────────────────────────────────────────────
"""

import json
import logging
import os
import random
from typing import List, Optional

from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Check if we should use mock LLM (for testing without API key)
USE_MOCK_LLM = settings.use_mock_llm

# Only import OpenAI if we're not using mock
if not USE_MOCK_LLM:
    from openai import OpenAI
    # Initialize OpenAI client (new SDK 1.0.0+ interface)
    client = None

    def _get_openai_client() -> OpenAI:
        """Get or create the OpenAI client instance."""
        global client
        if client is None:
            if not settings.openai_api_key:
                raise RuntimeError(
                    "OPENAI_API_KEY is not set. Set it in .env or the environment and restart the backend."
                )
            client = OpenAI(api_key=settings.openai_api_key)
        return client


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

def _get_openai_client():
    """Get or create the OpenAI client instance (only when not using mock)."""
    global client
    if client is None:
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Set it in .env or the environment and restart the backend."
            )
        client = OpenAI(api_key=settings.openai_api_key)
    return client


# ── Mock LLM helpers ───────────────────────────────────────────

def _generate_mock_itinerary(
    destination: str,
    duration: int,
    budget: str,
    travel_style: str,
    **kwargs
) -> dict:
    """Generate a mock itinerary for testing without OpenAI API."""
    logger.info(f"[MOCK] Generating itinerary for {destination} ({duration} days, {budget} budget)")
    
    # Budget-based cost estimates
    budget_costs = {
        "budget": {"accommodation": "Hostel or budget guesthouse", "daily_cost": 75, "meal_tip": "Street food and local eateries"},
        "moderate": {"accommodation": "3-star hotel or boutique Airbnb", "daily_cost": 200, "meal_tip": "Mix of local and mid-range restaurants"},
        "luxury": {"accommodation": "5-star hotel or luxury resort", "daily_cost": 500, "meal_tip": "Fine dining and premium experiences"},
    }
    
    budget_info = budget_costs.get(budget, budget_costs["moderate"])
    
    # Generate day plans
    activities = {
        "morning": [
            "Start your day with a sunrise walk through the historic old town",
            "Enjoy a leisurely breakfast at a local café before exploring",
            "Take an early morning guided tour to beat the crowds",
            "Begin with a refreshing morning hike or bike ride",
            "Visit the local market to experience the morning buzz",
        ],
        "afternoon": [
            "Explore the main attractions and museums in the city center",
            "Take a scenic boat tour or cable car ride",
            "Discover hidden gems in the local neighborhoods",
            "Visit iconic landmarks and take memorable photos",
            "Enjoy a traditional lunch at a highly-rated local restaurant",
        ],
        "evening": [
            "Watch the sunset from a scenic viewpoint",
            "Dine at a rooftop restaurant with panoramic city views",
            "Explore the vibrant nightlife in the entertainment district",
            "Enjoy a cultural show or live music performance",
            "Take a romantic evening stroll through illuminated streets",
        ],
    }
    
    themes = [
        "Discovery and Exploration",
        "Culture and History",
        "Nature and Adventure",
        "Food and Culinary Delights",
        "Relaxation and Wellness",
        "Local Life and Traditions",
        "Art and Architecture",
        "Scenic Wonders",
    ]
    
    packing_tips_pool = [
        "Pack comfortable walking shoes - you'll be exploring a lot!",
        "Bring a universal power adapter for your electronics",
        "Don't forget sunscreen and a hat for sunny days",
        "Pack a light jacket for cooler evenings",
        "Bring a reusable water bottle to stay hydrated",
        "Pack a small day bag for excursions",
        "Bring a camera to capture memorable moments",
        "Pack light, breathable clothing for daytime",
    ]
    
    days = []
    for day_num in range(1, duration + 1):
        day_plan = {
            "day_number": day_num,
            "theme": random.choice(themes),
            "morning": random.choice(activities["morning"]),
            "afternoon": random.choice(activities["afternoon"]),
            "evening": random.choice(activities["evening"]),
            "accommodation": budget_info["accommodation"],
            "estimated_cost": budget_info["daily_cost"] + random.randint(-20, 20),
            "tips": budget_info["meal_tip"],
        }
        days.append(day_plan)
    
    # Select random packing tips
    packing_tips = random.sample(packing_tips_pool, min(5, len(packing_tips_pool)))
    
    total_budget = sum(day["estimated_cost"] for day in days)
    
    itinerary = {
        "title": f"{duration} Days in {destination.split(',')[0]}: A {travel_style} Adventure",
        "destination_name": destination.split(",")[0] if "," in destination else destination,
        "summary": f"Experience the best of {destination} on this {duration}-day {travel_style} journey. "
                   f"Perfect for {budget} travelers seeking authentic experiences and memorable moments.",
        "days": days,
        "total_budget_est": total_budget,
        "best_time_to_go": "Spring (March-May) or Fall (September-November) for pleasant weather",
        "packing_tips": packing_tips,
    }
    
    return itinerary


def _generate_mock_destination_summary(dest_context: str, preferences: dict) -> str:
    """Generate a mock destination summary for testing."""
    logger.info("[MOCK] Generating destination summary")
    
    destination = preferences.get("destination", "this destination")
    travel_style = preferences.get("travel_style", "relaxed")
    budget = preferences.get("budget", "moderate")
    
    summaries = [
        f"{destination} is a perfect match for your {travel_style} travel style and {budget} budget. "
        f"You'll love the authentic experiences and warm hospitality that await you!",
        
        f"With your interest in {travel_style} travel, {destination} offers everything you're looking for. "
        f"The {budget} budget will go far here, allowing you to experience the best local culture.",
        
        f"{destination} aligns perfectly with your preferences! "
        f"Your {travel_style} approach to travel will be rewarded with unforgettable moments in this stunning location.",
        
        f"Based on your {travel_style} preferences and {budget} budget, {destination} is an ideal choice. "
        f"Get ready for an adventure filled with local charm and authentic experiences!",
    ]
    
    return random.choice(summaries)


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
    
    If USE_MOCK_LLM is True, returns a mock itinerary for testing.
    """
    # Use mock LLM if enabled
    if USE_MOCK_LLM:
        return _generate_mock_itinerary(
            destination=destination,
            duration=duration,
            budget=budget,
            travel_style=travel_style,
            climate=climate,
            dest_type=dest_type,
            interests=interests,
            dietary=dietary,
            accessibility=accessibility,
            dest_context=dest_context,
        )
    
    # Real OpenAI API call
    _get_openai_client()

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
        response = client.chat.completions.create(
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
    """
    Generate a short 'why this destination suits you' explanation.
    
    If USE_MOCK_LLM is True, returns a mock summary for testing.
    """
    # Use mock LLM if enabled
    if USE_MOCK_LLM:
        return _generate_mock_destination_summary(dest_context, preferences)
    
    # Real OpenAI API call
    _get_openai_client()

    prompt = (
        f"Given this traveller profile: {json.dumps(preferences)}\n"
        f"And this destination: {dest_context}\n"
        "Write 2 sentences explaining why this destination is a great match. Be specific and enthusiastic."
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()
