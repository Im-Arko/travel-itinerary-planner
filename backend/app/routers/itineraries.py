import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import User, Itinerary, ItineraryDay, Destination
from schemas.schemas import (
    ItineraryGenerateRequest, ItineraryOut, ItineraryWithDays,
    ItineraryUpdate, DayPlan,
)
from services.auth_service import get_current_user
from services import vector_store, llm_service

router = APIRouter(prefix="/api/itineraries", tags=["Itineraries"])


# ── Generate ───────────────────────────────────────────────────

@router.post("/generate", response_model=ItineraryWithDays, status_code=201,
             summary="Generate a personalised AI itinerary using vector search + LLM")
def generate_itinerary(
    payload:      ItineraryGenerateRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # 1. Build query string from preferences
    query_parts = [f"{payload.trip_duration}-day {payload.budget} {payload.destination_type} trip"]
    if payload.preferred_climate != "any":
        query_parts.append(f"{payload.preferred_climate} climate")
    if payload.interests:
        query_parts.append(f"interests: {', '.join(payload.interests)}")
    if payload.destination_hint:
        query_parts.append(payload.destination_hint)

    search_query = " ".join(query_parts)

    # 2. Semantic search for matching destinations
    matches = vector_store.semantic_search(
        query_text       = search_query,
        n_results        = 3,
        budget_filter    = payload.budget if payload.budget != "any" else None,
        climate_filter   = payload.preferred_climate if payload.preferred_climate != "any" else None,
        dest_type_filter = payload.destination_type if payload.destination_type != "any" else None,
    )

    if not matches:
        # Fallback: search without filters
        matches = vector_store.semantic_search(query_text=search_query, n_results=3)

    if not matches:
        raise HTTPException(
            status_code=503,
            detail="No destinations available. Please run /api/destinations/ingest first.",
        )

    best_match  = matches[0]
    dest_obj    = db.query(Destination).filter(Destination.id == best_match["destination_id"]).first()
    dest_name   = best_match["name"]
    dest_ctx    = best_match["document"]

    # 3. Generate itinerary with LLM
    raw = llm_service.generate_itinerary(
        destination  = f"{best_match['name']}, {best_match['country']}",
        duration     = payload.trip_duration,
        budget       = payload.budget,
        travel_style = payload.travel_style,
        climate      = payload.preferred_climate,
        dest_type    = payload.destination_type,
        interests    = payload.interests,
        dietary      = None,
        accessibility = False,
        dest_context = dest_ctx,
    )

    # 4. Persist to DB
    itin = Itinerary(
        user_id          = current_user.id,
        destination_id   = dest_obj.id if dest_obj else None,
        title            = raw.get("title", f"{payload.trip_duration} Days in {dest_name}"),
        destination_name = raw.get("destination_name", dest_name),
        duration_days    = payload.trip_duration,
        budget           = payload.budget,
        travel_style     = payload.travel_style,
        summary          = raw.get("summary"),
        full_itinerary   = json.dumps(raw),
        status           = "saved",
    )
    db.add(itin)
    db.flush()

    # 5. Persist day-wise breakdown
    days_out = []
    for d in raw.get("days", []):
        day = ItineraryDay(
            itinerary_id   = itin.id,
            day_number     = d["day_number"],
            theme          = d.get("theme"),
            morning        = d.get("morning"),
            afternoon      = d.get("afternoon"),
            evening        = d.get("evening"),
            accommodation  = d.get("accommodation"),
            estimated_cost = d.get("estimated_cost"),
            tips           = d.get("tips"),
        )
        db.add(day)
        days_out.append(DayPlan(**{k: d.get(k) for k in DayPlan.model_fields}))

    db.commit()
    db.refresh(itin)

    result = ItineraryWithDays.model_validate(itin)
    result.days = days_out
    return result


# ── List ───────────────────────────────────────────────────────

@router.get("/", response_model=List[ItineraryOut],
            summary="List all saved itineraries for the current user")
def list_itineraries(
    status:       Optional[str] = Query(None),
    favorites:    Optional[bool] = Query(None),
    skip:         int           = Query(0, ge=0),
    limit:        int           = Query(20, ge=1, le=100),
    db:           Session       = Depends(get_db),
    current_user: User          = Depends(get_current_user),
):
    q = db.query(Itinerary).filter(Itinerary.user_id == current_user.id)
    if status:
        q = q.filter(Itinerary.status == status)
    if favorites is not None:
        q = q.filter(Itinerary.is_favorite == favorites)
    q = q.order_by(Itinerary.generated_at.desc())
    return q.offset(skip).limit(limit).all()


@router.get("/{itinerary_id}", response_model=ItineraryWithDays,
            summary="Get full details of a saved itinerary including day plans")
def get_itinerary(
    itinerary_id: int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    itin = db.query(Itinerary).filter(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == current_user.id,
    ).first()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    result = ItineraryWithDays.model_validate(itin)
    result.days = [
        DayPlan(
            day_number     = d.day_number,
            theme          = d.theme or "",
            morning        = d.morning or "",
            afternoon      = d.afternoon or "",
            evening        = d.evening or "",
            accommodation  = d.accommodation,
            estimated_cost = float(d.estimated_cost) if d.estimated_cost else None,
            tips           = d.tips,
        )
        for d in itin.days
    ]
    return result


@router.patch("/{itinerary_id}", response_model=ItineraryOut,
              summary="Update itinerary metadata (favourite, rating, notes, status)")
def update_itinerary(
    itinerary_id: int,
    payload:      ItineraryUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    itin = db.query(Itinerary).filter(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == current_user.id,
    ).first()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(itin, field, val)

    db.commit()
    db.refresh(itin)
    return itin


@router.delete("/{itinerary_id}", status_code=204,
               summary="Delete a saved itinerary")
def delete_itinerary(
    itinerary_id: int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    itin = db.query(Itinerary).filter(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == current_user.id,
    ).first()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    db.delete(itin)
    db.commit()
