import json
from ..time_utils import utcnow

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..database.session import get_db
from ..database.models import UserPreference, User
from ..services.auth_service import get_current_user
from ..schemas.schemas import PreferenceOut, PreferenceUpsert


router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


def _to_out(pref: UserPreference) -> PreferenceOut:
    try:
        interests = json.loads(pref.interests) if pref.interests else []
    except json.JSONDecodeError:
        interests = []

    return PreferenceOut(
        id=pref.id,
        user_id=pref.user_id,
        budget=pref.budget,
        preferred_climate=pref.preferred_climate,
        destination_type=pref.destination_type,
        trip_duration=pref.trip_duration,
        travel_style=pref.travel_style,
        interests=interests,
        dietary_needs=pref.dietary_needs,
        accessibility=bool(pref.accessibility),
        planning_details=pref.planning_details or {},
        created_at=pref.created_at,
        updated_at=pref.updated_at,
    )


@router.get("/", response_model=PreferenceOut)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )

    if not pref:
        raise HTTPException(status_code=404, detail="Preferences not found")

    return _to_out(pref)


@router.put("/", response_model=PreferenceOut)
def upsert_preferences(
    payload: PreferenceUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )

    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    fields = payload.model_fields_set if pref.id is not None else set(type(payload).model_fields)
    for field in fields:
        value = getattr(payload, field)
        if field == "interests":
            value = json.dumps(value)
        elif field == "planning_details":
            value = value.model_dump()
        setattr(pref, field, value)
    pref.updated_at = utcnow()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Preferences changed concurrently; please retry") from None
    db.refresh(pref)
    return _to_out(pref)


@router.post("/", response_model=PreferenceOut, status_code=201)
def create_or_replace_preferences(
    payload: PreferenceUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return upsert_preferences(payload, db, current_user)
