from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from ..config import get_settings
from .connection import create_database_engine

settings = get_settings()

engine = create_database_engine(settings)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def release_read_transaction(db: Session):
    """Return a read connection before slow model work without discarding writes."""
    if db.new or db.dirty or db.deleted:
        raise RuntimeError("Model work requires a session without pending writes")
    db.rollback()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
