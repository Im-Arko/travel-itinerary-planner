"""Generate the private Supabase schema from the application's ORM metadata.

This script emits DDL only. It never prints credentials or application records.
Apply it through Supabase migrations using the project owner's connection.
"""
from sqlalchemy import MetaData
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable
from app.database.models import Base

SCHEMA = "travellant"
RUNTIME_ROLE = "travellant_app"


def migration_sql():
    metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        table.to_metadata(metadata, schema=SCHEMA)
    statements = [
        f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA}";',
        f'REVOKE ALL ON SCHEMA "{SCHEMA}" FROM PUBLIC, anon, authenticated;',
        f"""DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{RUNTIME_ROLE}') THEN
    CREATE ROLE {RUNTIME_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
END IF;
END $$;""",
    ]
    dialect = postgresql.dialect()
    for table in metadata.sorted_tables:
        statements.append(str(CreateTable(table).compile(dialect=dialect)).strip() + ";")
        for index in sorted(table.indexes, key=lambda item: item.name):
            statements.append(str(CreateIndex(index).compile(dialect=dialect)).strip() + ";")
        qualified = f'"{SCHEMA}"."{table.name}"'
        statements.extend([
            f"REVOKE ALL ON TABLE {qualified} FROM PUBLIC, anon, authenticated;",
            f"ALTER TABLE {qualified} ENABLE ROW LEVEL SECURITY;",
            f"CREATE POLICY backend_access ON {qualified} FOR ALL TO {RUNTIME_ROLE} USING (true) WITH CHECK (true);",
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON {qualified} TO {RUNTIME_ROLE};",
        ])
    statements.extend([
        f'GRANT USAGE ON SCHEMA "{SCHEMA}" TO {RUNTIME_ROLE};',
        f'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "{SCHEMA}" TO {RUNTIME_ROLE};',
        f'ALTER ROLE {RUNTIME_ROLE} SET search_path TO "{SCHEMA}", pg_catalog;',
        f"ALTER ROLE {RUNTIME_ROLE} SET statement_timeout = '30s';",
        f"ALTER ROLE {RUNTIME_ROLE} SET idle_in_transaction_session_timeout = '30s';",
    ])
    return "\n".join(line.rstrip() for line in "\n\n".join(statements).splitlines()) + "\n"


if __name__ == "__main__":
    print(migration_sql(), end="")
