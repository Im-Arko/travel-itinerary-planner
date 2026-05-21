import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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

    pref.budget = payload.budget
    pref.preferred_climate = payload.preferred_climate
    pref.destination_type = payload.destination_type
    pref.trip_duration = payload.trip_duration
    pref.travel_style = payload.travel_style
    pref.interests = json.dumps(payload.interests)
    pref.dietary_needs = payload.dietary_needs
    pref.accessibility = payload.accessibility
    pref.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(pref)
    return _to_out(pref)


@router.post("/", response_model=PreferenceOut, status_code=201)
def create_or_replace_preferences(
    payload: PreferenceUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return upsert_preferences(payload, db, current_user)
