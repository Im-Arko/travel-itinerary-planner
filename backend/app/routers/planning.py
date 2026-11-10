from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..config import get_settings
from ..database.models import PlanningRequest, User
from ..database.session import get_db, release_read_transaction
from ..schemas.planning import TripRequest, JobOut
from ..services.auth_service import get_current_user
from ..services import planning_jobs, travel_data, ai_planner
from ..security import enforce_limit, search_limit

router = APIRouter(prefix="/api/planning", tags=["Planning"])


@router.get("/capabilities")
def capabilities():
    settings = get_settings()
    return {"ai_available": ai_planner.available(), "provider": settings.llm_provider if ai_planner.available() else None, "guided_available": True,
            "mode_description": "AI-assisted selection from sourced nearby attractions; prices and availability are not quoted.", "source_attribution": "GeoNames / Open-Meteo and Wikipedia contributors"}


@router.get("/places", dependencies=[Depends(search_limit)])
def places(q: str = Query(min_length=2, max_length=150), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    release_read_transaction(db)
    return travel_data.search_places(q)


@router.post("/jobs/{request_key}", response_model=JobOut, status_code=202)
def start(request_key: UUID, payload: TripRequest, background: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user.id
    enforce_limit(db, "planning-attempts", str(user_id), 30, 600)
    job, created = planning_jobs.create(db, user_id, str(request_key), payload)
    result = planning_jobs.output(job)
    if created:
        background.add_task(planning_jobs.run, user_id, str(request_key))
    return result


@router.get("/jobs/{request_key}", response_model=JobOut)
def progress(request_key: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    planning_jobs.expire_interrupted(db, user.id)
    job = db.get(PlanningRequest, (user.id, str(request_key)))
    if not job:
        raise HTTPException(404, "Planning request not found")
    return planning_jobs.output(job)


@router.get("/active", response_model=JobOut | None)
def active(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    planning_jobs.expire_interrupted(db, user.id)
    job = db.query(PlanningRequest).filter(PlanningRequest.user_id == user.id, PlanningRequest.status.in_(["pending", "running"])).order_by(PlanningRequest.created_at.desc()).first()
    return planning_jobs.output(job) if job else None


@router.delete("/jobs/{request_key}", response_model=JobOut)
def cancel(request_key: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Use the same per-user lock as final saving so cancellation and completion
    # have one definite order, including requests made from a different tab.
    db.query(User).filter_by(id=user.id).with_for_update().one()
    job = db.get(PlanningRequest, (user.id, str(request_key)))
    if not job:
        raise HTTPException(404, "Planning request not found")
    if job.status not in ("complete", "failed", "cancelled"):
        job.status, job.phase = "cancelled", "cancelled"
        db.commit()
    return planning_jobs.output(job)
