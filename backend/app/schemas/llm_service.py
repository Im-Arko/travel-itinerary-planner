"""
LLM Service
──────────────────────────────────────────────────────────────
Uses LangChain + OpenAI to generate personalised day-wise travel
itineraries based on user preferences and matched destinations.
"""

import json
import logging
from typing import List, Optional

from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings

logger   = logging.getLogger(__name__)
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


# ── LLM Factory ────────────────────────────────────────────────

def _get_llm():
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model       = "gpt-4o-mini",
        temperature = 0.7,
        api_key     = settings.openai_api_key,
    )


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
    Call OpenAI via LangChain to generate a structured itinerary.
    Returns a dict with keys matching ItineraryLLM schema.
    """
    from langchain.output_parsers import PydanticOutputParser
    from langchain_core.messages import SystemMessage, HumanMessage

    parser = PydanticOutputParser(pydantic_object=ItineraryLLM)

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
        format_instructions = parser.get_format_instructions(),
    )

    llm      = _get_llm()
    messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt_text)]

    logger.info("Generating itinerary for %s (%d days, %s budget)", destination, duration, budget)
    response = llm.invoke(messages)

    # Extract JSON from response
    raw = response.content
    # Strip markdown fences if present
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    parsed = json.loads(raw)
    return parsed


def generate_destination_summary(dest_context: str, preferences: dict) -> str:
    """Generate a short 'why this destination suits you' explanation."""
    from langchain_core.messages import HumanMessage

    llm = _get_llm()
    prompt = f"""Given this traveller profile: {json.dumps(preferences)}
And this destination: {dest_context}
Write 2 sentences explaining why this destination is a great match. Be specific and enthusiastic."""
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content.strip()
