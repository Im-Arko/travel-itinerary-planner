from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from ..config import get_settings
from .connection import create_database_engine

settings = get_settings()

engine = create_database_engine(settings)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
