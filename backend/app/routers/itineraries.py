import json
import hashlib
from uuid import UUID, uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from ..database.session import get_db, release_read_transaction
from ..database.models import User, Itinerary, PlanningRequest
from ..schemas.schemas import ItineraryOut, ItinerarySummary, ItineraryWithDays, ItineraryUpdate, DayPlan
from ..schemas.planning import TripRequest, DayOrder
from ..services.auth_service import get_current_user
from ..services import planning_jobs
from ..security import enforce_limit

router = APIRouter(prefix="/api/itineraries", tags=["Itineraries"])


def owned(db, user_id, itinerary_id):
    itinerary = db.query(Itinerary).filter_by(id=itinerary_id, user_id=user_id).first()
    if not itinerary:
        raise HTTPException(404, "Itinerary not found")
    return itinerary


def serialize(itinerary):
    result = ItineraryWithDays(**ItineraryOut.model_validate(itinerary).model_dump(), days=[])
    rich = {day.get("day_number"): day for day in itinerary.plan.get("days", [])}
    result.days = [DayPlan.model_validate({**rich.get(day.day_number, {}), "day_number": day.day_number, "theme": day.theme or "", "morning": day.morning or "", "afternoon": day.afternoon or "", "evening": day.evening or "",
                                          "accommodation": day.accommodation, "estimated_cost": float(day.estimated_cost) if day.estimated_cost is not None else None, "tips": day.tips}) for day in itinerary.days]
    return result


@router.post("/generate", response_model=ItineraryWithDays, status_code=201)
def generate_itinerary(payload: TripRequest, idempotency_key: UUID | None = Header(None), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user_id = user.id
    enforce_limit(db, "planning-attempts", str(user_id), 30, 600)
    job, created = planning_jobs.create(db, user_id, str(idempotency_key or uuid4()), payload)
    request_key = job.request_key
    release_read_transaction(db)
    if created:
        planning_jobs.run(user_id, request_key)
    db.expire_all()
    job = db.get(PlanningRequest, (user_id, request_key))
    if job.status == "complete":
        return serialize(owned(db, user_id, job.itinerary_id))
    if job.status in ("pending", "running"):
        raise HTTPException(409, "This request is already being planned. Check its progress.")
    raise HTTPException(job.error_code or 409, job.error or "Planning was cancelled.")


def filtered(db, user_id, status, favorites):
    query = db.query(Itinerary).filter(Itinerary.user_id == user_id)
    if status:
        query = query.filter(Itinerary.status == status)
    if favorites is not None:
        query = query.filter(Itinerary.is_favorite == favorites)
    return query


@router.get("/page")
def page(status: str | None = None, favorites: bool | None = None, skip: int = Query(0, ge=0), limit: int = Query(24, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = filtered(db, user.id, status, favorites)
    all_trips = db.query(Itinerary).filter(Itinerary.user_id == user.id)
    return {"items": [ItinerarySummary.model_validate(row) for row in query.order_by(Itinerary.generated_at.desc(), Itinerary.id.desc()).offset(skip).limit(limit).all()], "total": query.count(), "total_all": all_trips.count(), "total_favorites": all_trips.filter(Itinerary.is_favorite.is_(True)).count(), "skip": skip, "limit": limit}


@router.get("/", response_model=list[ItineraryOut])
def list_itineraries(status: str | None = None, favorites: bool | None = None, skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return filtered(db, user.id, status, favorites).order_by(Itinerary.generated_at.desc(), Itinerary.id.desc()).offset(skip).limit(limit).all()


@router.get("/{itinerary_id}", response_model=ItineraryWithDays)
def get_itinerary(itinerary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return serialize(owned(db, user.id, itinerary_id))


@router.patch("/{itinerary_id}", response_model=ItineraryOut)
def update_itinerary(itinerary_id: int, payload: ItineraryUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    itinerary = owned(db, user.id, itinerary_id)
    values = payload.model_dump(exclude_unset=True)
    for key, value in values.items():
        if value is None and key not in ("rating", "user_notes"):
            raise HTTPException(422, f"{key} cannot be empty")
        setattr(itinerary, key, value)
    if "title" in values:
        plan = itinerary.plan
        plan["title"] = itinerary.title
        itinerary.full_itinerary = json.dumps(plan)
    db.commit()
    db.refresh(itinerary)
    return itinerary


class DayEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    morning: str | None = Field(None, min_length=1, max_length=3000)
    afternoon: str | None = Field(None, min_length=1, max_length=3000)
    evening: str | None = Field(None, min_length=1, max_length=3000)
    user_note: str | None = Field(None, max_length=3000)


@router.patch("/{itinerary_id}/days/{day_number}", response_model=ItineraryWithDays)
def edit_day(itinerary_id: int, day_number: int, payload: DayEdit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    itinerary = owned(db, user.id, itinerary_id)
    day = next((day for day in itinerary.days if day.day_number == day_number), None)
    if not day:
        raise HTTPException(404, "Day not found")
    plan = itinerary.plan
    rich = next((item for item in plan.get("days", []) if item["day_number"] == day_number), None)
    for key, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        if key != "user_note":
            setattr(day, key, value)
        if rich is not None:
            rich[key] = value
            if key != "user_note":
                rich.setdefault("user_edited_slots", []).append(key)
    itinerary.full_itinerary = json.dumps(plan)
    db.commit()
    db.refresh(itinerary)
    return serialize(itinerary)


@router.put("/{itinerary_id}/day-order", response_model=ItineraryWithDays)
def reorder_days(itinerary_id: int, payload: DayOrder, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    itinerary = owned(db, user.id, itinerary_id)
    original = {day.day_number: day for day in itinerary.days}
    if sorted(payload.day_numbers) != sorted(original) or len(set(payload.day_numbers)) != len(original):
        raise HTTPException(422, "Include each existing day exactly once")
    plan = itinerary.plan
    if len(plan.get("places", [])) > 1:
        raise HTTPException(422, "Reordering across multiple destinations would change transfers. Edit the stop order in a new plan.")
    request = plan.get("request", {})
    if (request.get("arrival_time") and payload.day_numbers[0] != 1) or (request.get("departure_time") and payload.day_numbers[-1] != len(original)):
        raise HTTPException(422, "Keep arrival and departure days in place; their sightseeing time is limited by your travel times.")
    snapshots = [{key: getattr(original[number], key) for key in ("theme", "morning", "afternoon", "evening", "accommodation", "estimated_cost", "tips")} for number in payload.day_numbers]
    for number, values in enumerate(snapshots, 1):
        for key, value in values.items():
            setattr(original[number], key, value)
    rich = {day["day_number"]: dict(day) for day in plan.get("days", [])}
    if rich:
        dates = {number: day.get("date") for number, day in rich.items()}
        plan["days"] = [{**rich[old], "day_number": new, "date": dates.get(new)} for new, old in enumerate(payload.day_numbers, 1)]
    itinerary.full_itinerary = json.dumps(plan)
    db.commit()
    db.refresh(itinerary)
    return serialize(itinerary)


@router.post("/{itinerary_id}/days/{day_number}/regenerate/{request_key}", status_code=202)
def regenerate_day(itinerary_id: int, day_number: int, request_key: UUID, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user_id = user.id
    enforce_limit(db, "planning-attempts", str(user_id), 30, 600)
    itinerary = owned(db, user_id, itinerary_id)
    document = itinerary.plan
    if document.get("schema_version") != 2 or not document.get("request"):
        raise HTTPException(422, "Legacy plans need a new sourced plan before individual days can be regenerated.")
    target = next((day for day in document["days"] if day["day_number"] == day_number), None)
    if not target:
        raise HTTPException(404, "Day not found")
    version = hashlib.sha256(itinerary.full_itinerary.encode()).hexdigest()
    request = TripRequest.model_validate({**document["request"], "stops": [], "place_id": target["place"]["id"], "trip_duration": 1, "start_date": target.get("date"), "arrival_time": None, "departure_time": None})
    job, created = planning_jobs.create(db, user_id, str(request_key), request, operation_identity=f"regenerate:{itinerary_id}:{day_number}")
    if created:
        job.itinerary_id = itinerary_id
        operation = {"kind": "regenerate_day", "itinerary_id": itinerary_id, "day_number": day_number, "version": version,
                     "excluded_ids": [a["attraction_id"] for day in document["days"] for a in day.get("activities", [])]}
        job.request_payload = {**job.request_payload, "_operation": operation}
        db.commit()
        background.add_task(planning_jobs.run, user_id, str(request_key))
    return planning_jobs.output(job)


@router.delete("/{itinerary_id}", status_code=204)
def delete_itinerary(itinerary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(owned(db, user.id, itinerary_id))
    db.commit()
