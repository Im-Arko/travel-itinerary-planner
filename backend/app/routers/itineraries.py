import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database.session import get_db, release_read_transaction
from ..database.models import User, Itinerary, ItineraryDay, Destination
from ..schemas.schemas import (
    ItineraryGenerateRequest, ItineraryOut, ItineraryWithDays,
    ItineraryUpdate, DayPlan,
)
from ..services.auth_service import get_current_user
from ..services.destination_service import resolve_requested_destination, same_destination
from ..schemas import vector_store, llm_service
from ..security import generation_limit

router = APIRouter(prefix="/api/itineraries", tags=["Itineraries"])


# ── Generate ───────────────────────────────────────────────────

@router.post("/generate", response_model=ItineraryWithDays, status_code=201, dependencies=[Depends(generation_limit)],
             summary="Generate a personalised AI itinerary using vector search + LLM")
def generate_itinerary(
    payload:      ItineraryGenerateRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    user_id = current_user.id
    requested_destination = resolve_requested_destination(db, payload.destination_hint)
    if requested_destination:
        best_match = requested_destination
    else:
        best_match = recommend_destination(db, payload)

    destination_id = best_match["destination_id"]
    dest_name = best_match["name"]
    release_read_transaction(db)

    # The selected place is fixed. Preferences shape the activities there.
    try:
        raw = llm_service.generate_itinerary(
            destination=dest_name,
            duration=payload.trip_duration,
            budget=payload.budget,
            travel_style=payload.travel_style,
            climate=payload.preferred_climate,
            dest_type=payload.destination_type,
            interests=payload.interests,
            dietary=None,
            accessibility=False,
            dest_context=best_match["document"],
        )
        raw = llm_service.ItineraryLLM.model_validate(raw).model_dump()
        if [day["day_number"] for day in raw["days"]] != list(range(1, payload.trip_duration + 1)):
            raise ValueError("Invalid day sequence")
        if not same_destination(raw["destination_name"], dest_name, best_match["country"]):
            raise ValueError("The provider changed the selected destination")
        raw["destination_name"] = dest_name
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Trip generation is temporarily unavailable") from None
    except (ValueError, TypeError):
        raise HTTPException(status_code=502, detail="The trip provider returned an invalid itinerary") from None

    itin = Itinerary(
        user_id=user_id,
        destination_id=destination_id,
        title=raw["title"],
        destination_name=dest_name,
        duration_days=payload.trip_duration,
        budget=payload.budget,
        travel_style=payload.travel_style,
        summary=raw["summary"],
        full_itinerary=json.dumps(raw),
        status="saved",
    )
    db.add(itin)
    db.flush()
    days_out = []
    for day_data in raw["days"]:
        db.add(ItineraryDay(itinerary_id=itin.id, **day_data))
        days_out.append(DayPlan(**day_data))
    db.commit()
    db.refresh(itin)
    result = ItineraryWithDays.model_validate(itin)
    result.days = days_out
    return result


def recommend_destination(db: Session, payload: ItineraryGenerateRequest) -> dict:
    """Use preference matching only when the traveller hasn't named a place."""
    if db.query(Destination).count() == 0:
        raise HTTPException(
            status_code=503,
            detail="No destinations exist in the database. Seed destination data before generating itineraries.",
        )

    if vector_store.collection_count(db) == 0:
        ingested = vector_store.ingest_destinations(db)
        if ingested == 0:
            raise HTTPException(
                status_code=503,
                detail="Vector ingestion failed because no destinations were available.",
            )

    # 1. Build query string from preferences
    query_parts = [f"{payload.trip_duration}-day {payload.budget} {payload.destination_type} trip"]
    if payload.preferred_climate != "any":
        query_parts.append(f"{payload.preferred_climate} climate")
    if payload.interests:
        query_parts.append(f"interests: {', '.join(payload.interests)}")

    search_query = " ".join(query_parts)

    # 2. Semantic search for matching destinations
    matches = vector_store.semantic_search(db=db,
        query_text       = search_query,
        n_results        = 3,
        budget_filter    = payload.budget if payload.budget != "any" else None,
        climate_filter   = payload.preferred_climate if payload.preferred_climate != "any" else None,
        dest_type_filter = payload.destination_type if payload.destination_type != "any" else None,
    )

    if not matches:
        # Fallback: search without filters
        matches = vector_store.semantic_search(db=db, query_text=search_query, n_results=3)

    if not matches:
        fallback_dest = db.query(Destination).first()
        if not fallback_dest:
            raise HTTPException(
                status_code=503,
                detail="No destinations available. Please run /api/destinations/ingest first.",
            )
        matches = [{
            "destination_id": fallback_dest.id,
            "name": fallback_dest.name,
            "country": fallback_dest.country,
            "score": 0,
            "document": (
                f"Destination: {fallback_dest.name}, {fallback_dest.country}. "
                f"Type: {fallback_dest.destination_type}. "
                f"Climate: {fallback_dest.climate_type}. "
                f"Budget: {fallback_dest.budget_level}. "
                f"{fallback_dest.description}"
            ),
        }]

    return matches[0]


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
