"""Persistent request identity and cancellation; charge only committed plans."""
import hashlib
import json
import time
from datetime import timedelta
from ..time_utils import utcnow
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from ..database.models import User, UserPreference, Destination, Itinerary, ItineraryDay, PlanningRequest
from ..database.session import SessionLocal
from ..schemas.planning import TripRequest, JobOut
from . import trip_planner, travel_data


def snapshot_preferences(db, user_id, request):
    pref = db.query(UserPreference).filter_by(user_id=user_id).first()
    values = request.model_dump()
    if pref:
        for name in ("budget", "preferred_climate", "destination_type", "travel_style", "dietary_needs", "accessibility"):
            if name not in request.model_fields_set or values[name] is None:
                values[name] = getattr(pref, name)
        if "interests" not in request.model_fields_set or request.interests is None:
            try:
                values["interests"] = json.loads(pref.interests or "[]")
            except ValueError:
                values["interests"] = []
    for name, default in {"budget": "moderate", "preferred_climate": "any", "destination_type": "any", "travel_style": "solo", "interests": [], "accessibility": False}.items():
        if values[name] is None:
            values[name] = default
    return TripRequest.model_validate(values)


def output(job):
    return JobOut(request_key=job.request_key, status=job.status, phase=job.phase, itinerary_id=job.itinerary_id, error=job.error, error_code=job.error_code)


def expire_interrupted(db, user_id):
    # Jobs survive in SQL, but the free web process can restart. A stale request
    # becomes retryable instead of leaving a user locked in a permanent spinner.
    stale = db.query(PlanningRequest).filter(PlanningRequest.user_id == user_id, PlanningRequest.status.in_(["pending", "running"]), PlanningRequest.updated_at < utcnow()-timedelta(minutes=6)).all()
    for job in stale:
        job.status, job.phase, job.error_code, job.error = "failed", "failed", 503, "Planning was interrupted. Start a new request; your successful-plan allowance was not charged."
    if stale:
        db.commit()


def successful_count(db, user_id):
    return db.query(func.count()).select_from(PlanningRequest).filter(PlanningRequest.user_id == user_id, PlanningRequest.status == "complete", PlanningRequest.completed_at >= utcnow()-timedelta(hours=1)).scalar()


def create(db, user_id, request_key, request, operation_identity=None):
    expire_interrupted(db, user_id)
    original = request.model_dump(mode="json")
    if operation_identity:
        original["operation_identity"] = operation_identity
    digest = hashlib.sha256(json.dumps(original, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    db.query(User).filter_by(id=user_id).with_for_update().one()
    existing = db.get(PlanningRequest, (user_id, request_key))
    if existing:
        if existing.payload_hash != digest:
            raise HTTPException(409, "This request ID belongs to different trip details. Start a new plan.")
        if existing.status in ("pending", "running") and existing.updated_at < utcnow()-timedelta(minutes=15):
            existing.status, existing.error, existing.error_code = "failed", "Planning was interrupted. You can retry safely.", 503
            db.commit()
        return existing, False
    if successful_count(db, user_id) >= 5:
        raise HTTPException(429, "You have created five plans in the last hour. Try again later.", headers={"Retry-After": "3600"})
    active = db.query(PlanningRequest).filter(PlanningRequest.user_id == user_id, PlanningRequest.status.in_(["pending", "running"]), PlanningRequest.updated_at >= utcnow()-timedelta(minutes=15)).first()
    if active:
        raise HTTPException(409, "A trip is already being planned. Open its progress or cancel it first.")
    resolved = snapshot_preferences(db, user_id, request)
    job = PlanningRequest(user_id=user_id, request_key=request_key, payload_hash=digest, request_payload=resolved.model_dump(mode="json"), status="pending", phase="queued")
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.get(PlanningRequest, (user_id, request_key))
        if existing and existing.payload_hash == digest:
            return existing, False
        raise HTTPException(409, "A planning request changed concurrently. Please retry.") from None
    db.refresh(job)
    return job, True


def _recommend(request):
    with SessionLocal() as db:
        query = db.query(Destination)
        for key, column in (("budget", Destination.budget_level), ("preferred_climate", Destination.climate_type), ("destination_type", Destination.destination_type)):
            value = getattr(request, key)
            if value and value != "any":
                query = query.filter(column == value)
        candidates = [(row.name, row.country, row.latitude, row.longitude, row.tags or "") for row in query.all()]
    if not candidates:
        raise HTTPException(422, "No catalog destinations match all these filters. Change a filter or select a destination; your preferences were not relaxed.")
    interests = {item.lower().rstrip("s") for item in request.interests or []}
    candidates.sort(key=lambda row: (-sum(item in row[4].lower() for item in interests), row[0]))
    name, country, lat, lon, _ = candidates[0]
    aliases = {"USA": "US", "UK": "GB"}
    choices = travel_data.search_places(name + ", " + aliases.get(country, country))
    if not choices:
        raise HTTPException(422, f"Please select the intended city for {name} from the destination search.")
    chosen = min(choices, key=lambda p: travel_data.distance_km(float(lat or p.latitude), float(lon or p.longitude), p.latitude, p.longitude))
    return request.model_copy(update={"place_id": chosen.id, "destination_hint": chosen.label})


def run(user_id, request_key):
    started = time.monotonic()
    def cancelled():
        with SessionLocal() as db:
            job = db.get(PlanningRequest, (user_id, request_key))
            return job is None or job.status == "cancelled"
    def phase(value):
        if time.monotonic()-started > 300:
            raise HTTPException(503, "Planning took too long. Please retry with fewer days or stops.")
        with SessionLocal() as db:
            job = db.get(PlanningRequest, (user_id, request_key))
            if not job or job.status == "cancelled":
                raise HTTPException(409, "Planning was cancelled.")
            job.status, job.phase, job.updated_at = "running", value, utcnow()
            db.commit()
    try:
        with SessionLocal() as db:
            job = db.get(PlanningRequest, (user_id, request_key))
            if not job or job.status != "pending":
                return
            stored = dict(job.request_payload)
            operation = stored.pop("_operation", None)
            request = TripRequest.model_validate(stored)
        if not request.place_id and not request.stops and not request.destination_hint:
            request = _recommend(request)
        plan = trip_planner.build(request, phase, cancelled, operation.get("excluded_ids", []) if operation else None)
        phase("saving")
        with SessionLocal() as db:
            # Serialize final quota accounting per user. Deleting a plan does not
            # erase its completed request or restore its success allowance.
            user = db.query(User).filter_by(id=user_id).with_for_update().first()
            job = db.get(PlanningRequest, (user_id, request_key))
            if not user or not job or job.status == "cancelled":
                return
            if successful_count(db, user_id) >= 5:
                raise HTTPException(429, "You have created five plans in the last hour. Please try later.")
            if operation and operation.get("kind") == "regenerate_day":
                itinerary = db.query(Itinerary).filter_by(id=operation["itinerary_id"], user_id=user_id).with_for_update().first()
                if not itinerary or hashlib.sha256(itinerary.full_itinerary.encode()).hexdigest() != operation["version"]:
                    raise HTTPException(409, "The itinerary changed while this day was being planned. Please refresh and retry.")
                number = operation["day_number"]
                document = itinerary.plan
                old_day = next(day for day in document["days"] if day["day_number"] == number)
                new_day = {**plan["days"][0], "day_number": number, "date": old_day.get("date"), "user_note": old_day.get("user_note", "")}
                document["days"] = [new_day if day["day_number"] == number else day for day in document["days"]]
                itinerary.full_itinerary = json.dumps(document)
                row = next(day for day in itinerary.days if day.day_number == number)
                for key in ("theme", "morning", "afternoon", "evening", "accommodation", "estimated_cost", "tips"):
                    setattr(row, key, new_day[key])
                job.status, job.phase, job.itinerary_id = "complete", "complete", itinerary.id
                job.completed_at, job.updated_at = utcnow(), utcnow()
                db.commit()
                return
            first = plan["places"][0]
            destination = db.query(Destination).filter(Destination.name == first["name"], Destination.country == first["country"]).first()
            itinerary = Itinerary(user_id=user_id, destination_id=destination.id if destination else None, title=plan["title"], destination_name=plan["destination_name"], duration_days=len(plan["days"]), budget=request.budget,
                                  travel_style=request.travel_style, summary=plan["summary"], full_itinerary=json.dumps(plan), status="saved")
            db.add(itinerary)
            db.flush()
            for day in plan["days"]:
                db.add(ItineraryDay(itinerary_id=itinerary.id, **{key: day[key] for key in ("day_number", "theme", "morning", "afternoon", "evening", "accommodation", "estimated_cost", "tips")}))
            job.status, job.phase, job.itinerary_id = "complete", "complete", itinerary.id
            job.completed_at, job.updated_at = utcnow(), utcnow()
            db.commit()
    except Exception as error:
        code = error.status_code if isinstance(error, HTTPException) else 503
        detail = error.detail if isinstance(error, HTTPException) else "Planning was interrupted. You can retry safely."
        if isinstance(detail, dict):
            detail = detail.get("message", "Choose a destination including its region and country.")
        with SessionLocal() as db:
            job = db.get(PlanningRequest, (user_id, request_key))
            if job and job.status != "cancelled":
                job.status, job.phase, job.error_code, job.error = "failed", "failed", code, str(detail)[:500]
                db.commit()
