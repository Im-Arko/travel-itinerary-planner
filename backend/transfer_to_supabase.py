"""Copy the existing local database into an empty private PostgreSQL schema.

Credentials are read from ignored environment files. The source is read-only;
the entire target copy and verification run in one transaction. Only table names
and counts are printed. Reset PostgreSQL sequences as the schema owner afterward.
"""
import argparse
from pathlib import Path
from sqlalchemy import func, select
from app.config import Settings
from app.database.connection import create_database_engine
from app.database.models import Base


def transfer(source_env: Path, target_env: Path):
    source_settings = Settings(_env_file=source_env, DATABASE_URL=None)
    # This is a database-only process; the local signing key is never sent to PostgreSQL.
    target_settings = Settings(_env_file=target_env, secret_key=source_settings.secret_key, app_env="development")
    if source_settings.database_url.host not in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("The source must be the existing local database")
    if not target_settings.connection_url:
        raise ValueError("The target environment must provide DATABASE_URL")
    source = create_database_engine(source_settings)
    target = create_database_engine(target_settings)
    if source.dialect.name != "mysql" or target.dialect.name != "postgresql":
        raise ValueError("This transfer requires a local MySQL source and a PostgreSQL target")
    # Old request quotas are transient and must not lock out the new deployment.
    tables = [table for table in Base.metadata.sorted_tables if table.name != "security_rate_limits"]
    counts = {}
    try:
        with source.connect().execution_options(isolation_level="REPEATABLE READ") as reader:
            with reader.begin(), target.begin() as writer:
                if any(writer.execute(select(func.count()).select_from(table)).scalar_one() for table in tables):
                    raise ValueError("Target tables must be empty; existing data will not be overwritten")
                for table in tables:
                    order = list(table.primary_key.columns)
                    records = [dict(row) for row in reader.execute(select(table).order_by(*order)).mappings()]
                    for offset in range(0, len(records), 50):
                        writer.execute(table.insert(), records[offset:offset + 50])
                    copied = [dict(row) for row in writer.execute(select(table).order_by(*order)).mappings()]
                    if copied != records:
                        raise ValueError(f"Record verification failed for {table.name}; copy rolled back")
                    counts[table.name] = len(records)
        for name, count in counts.items():
            print(f"Verified {name}: {count}")
        print("Source unchanged. Reset target sequences as the schema owner before enabling the API.")
        return counts
    finally:
        source.dispose()
        target.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-env", type=Path, default=Path(__file__).parent / ".env")
    parser.add_argument("--target-env", type=Path, required=True)
    args = parser.parse_args()
    transfer(args.source_env, args.target_env)
