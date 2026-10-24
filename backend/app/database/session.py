from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from ..config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
    hide_parameters=True,
    connect_args={
        "connect_timeout": 5, "read_timeout": 30, "write_timeout": 30,
        **({"ssl_ca": settings.db_ssl_ca, "ssl_verify_cert": True, "ssl_verify_identity": True}
           if settings.db_ssl_ca else {}),
    },
)

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
