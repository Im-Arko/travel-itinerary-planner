"""Create verified database connections without leaking connection parameters."""
import certifi
from pathlib import Path
from sqlalchemy import create_engine


def create_database_engine(settings):
    url = settings.database_url
    options = dict(pool_pre_ping=True, pool_recycle=1800, echo=False, hide_parameters=True)
    if url.get_backend_name() == "postgresql":
        default_ca = certifi.where()
        if url.host and url.host.endswith((".pooler.supabase.com", ".supabase.co")):
            default_ca = str(Path(__file__).resolve().parents[2] / "certs" / "supabase-prod-ca-2021.crt")
        connect_args = {
            "connect_timeout": 10,
            "sslmode": url.query.get("sslmode", "verify-full"),
            "sslrootcert": settings.db_ssl_ca or url.query.get("sslrootcert") or default_ca,
            "prepare_threshold": None,
            "options": "-c statement_timeout=30000 -c idle_in_transaction_session_timeout=30000",
        }
        return create_engine(
            url, **options, connect_args=connect_args, pool_size=3, max_overflow=2,
            execution_options={"schema_translate_map": {None: settings.db_schema}},
        )
    connect_args = {"connect_timeout": 5, "read_timeout": 30, "write_timeout": 30}
    if settings.db_ssl_ca:
        connect_args.update(ssl_ca=settings.db_ssl_ca, ssl_verify_cert=True, ssl_verify_identity=True)
    return create_engine(url, **options, connect_args=connect_args)
