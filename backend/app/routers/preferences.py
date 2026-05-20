from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database.session import get_db
from ..database.models import UserPreference, User
from ..services.auth_service import get_current_user
from ..schemas.schemas import PreferenceOut


router = APIRouter()

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

    return pref
