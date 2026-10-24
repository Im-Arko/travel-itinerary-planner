"""Audit first; --apply adds constraints only after all data checks pass.
Run with the database owner's migration credentials, never the runtime account.
No personal records or credentials are printed.
"""
import argparse
from sqlalchemy import inspect, text
from app.database.session import engine
from app.database.models import SecurityRateLimit

CHECKS = {
    "duplicate preference owners": "SELECT COUNT(*) FROM (SELECT user_id FROM user_preferences GROUP BY user_id HAVING COUNT(*) > 1) AS duplicates",
    "duplicate itinerary days": "SELECT COUNT(*) FROM (SELECT itinerary_id, day_number FROM itinerary_days GROUP BY itinerary_id, day_number HAVING COUNT(*) > 1) AS duplicates",
    "invalid preference durations": "SELECT COUNT(*) FROM user_preferences WHERE trip_duration IS NULL OR trip_duration NOT BETWEEN 1 AND 30",
    "invalid itinerary durations": "SELECT COUNT(*) FROM itineraries WHERE duration_days NOT BETWEEN 1 AND 30",
    "invalid ratings": "SELECT COUNT(*) FROM itineraries WHERE rating IS NOT NULL AND rating NOT BETWEEN 1 AND 5",
    "invalid day numbers": "SELECT COUNT(*) FROM itinerary_days WHERE day_number NOT BETWEEN 1 AND 30",
    "negative costs": "SELECT COUNT(*) FROM itinerary_days WHERE estimated_cost < 0",
    "invalid itinerary JSON": "SELECT COUNT(*) FROM itineraries WHERE NOT JSON_VALID(full_itinerary)",
    "invalid interest JSON": "SELECT COUNT(*) FROM user_preferences WHERE interests IS NOT NULL AND NOT JSON_VALID(interests)",
}
CONSTRAINTS = [
    ("user_preferences", "uq_preferences_user", "UNIQUE (user_id)", ["user_id"]),
    ("user_preferences", "ck_pref_duration", "CHECK (trip_duration IS NOT NULL AND trip_duration BETWEEN 1 AND 30)", None),
    ("user_preferences", "ck_pref_interests_json", "CHECK (interests IS NULL OR JSON_VALID(interests))", None),
    ("itineraries", "ck_itin_duration", "CHECK (duration_days BETWEEN 1 AND 30)", None),
    ("itineraries", "ck_itin_rating", "CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)", None),
    ("itineraries", "ck_itin_json", "CHECK (JSON_VALID(full_itinerary))", None),
    ("itinerary_days", "uq_itin_day", "UNIQUE (itinerary_id, day_number)", ["itinerary_id", "day_number"]),
    ("itinerary_days", "ck_day_number", "CHECK (day_number BETWEEN 1 AND 30)", None),
    ("itinerary_days", "ck_day_cost", "CHECK (estimated_cost IS NULL OR estimated_cost >= 0)", None),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    with engine.connect() as connection:
        if connection.dialect.name != "mysql":
            raise SystemExit("This migration targets MariaDB/MySQL only")
        failures = {}
        for label, sql in CHECKS.items():
            count = connection.execute(text(sql)).scalar_one()
            print(f"{label}: {count}")
            if count:
                failures[label] = count
        inspector = inspect(connection)
        required_fks = {
            "user_preferences": {"user_id"}, "itineraries": {"user_id", "destination_id"},
            "itinerary_days": {"itinerary_id"}, "refresh_tokens": {"user_id"},
        }
        for table, columns in required_fks.items():
            fks = inspector.get_foreign_keys(table)
            protected = {column for fk in fks for column in fk["constrained_columns"]}
            missing = columns - protected
            if missing:
                failures[f"missing foreign keys in {table}"] = len(missing)
            print(f"{table}: foreign keys {'OK' if not missing else 'MISSING'}")
        cipher = connection.execute(text("SHOW SESSION STATUS LIKE 'Ssl_cipher'")).fetchone()
        print("Database TLS:", "enabled" if cipher and cipher[1] else "disabled")
        grants = connection.execute(text("SHOW GRANTS")).fetchall()
        for row in grants:
            # The remainder can include usernames, hosts, and password hashes.
            if " ON " in row[0]:
                privileges, rest = row[0].split(" ON ", 1)
                print("Permission scope:", privileges, "ON", rest.split(" TO ")[0])
        if failures:
            raise SystemExit("Audit failed; no changes made. Resolve reported data/foreign-key issues before retrying.")
        statements = []
        for table, name, definition, unique_columns in CONSTRAINTS:
            existing = {c["name"] for c in inspector.get_check_constraints(table)}
            unique = inspector.get_unique_constraints(table) + [i for i in inspector.get_indexes(table) if i.get("unique")]
            if name in existing or (unique_columns and any(i["column_names"] == unique_columns for i in unique)):
                continue
            statements.append(f"ALTER TABLE {table} ADD CONSTRAINT {name} {definition}")
        if not any(i["column_names"] == ["user_id", "generated_at"] for i in inspector.get_indexes("itineraries")):
            statements.append("CREATE INDEX idx_itin_user_generated ON itineraries (user_id, generated_at)")
        missing_tables = [name for name in ("security_rate_limits", "destination_embeddings")
                          if not inspector.has_table(name)]
        for statement in statements:
            print(("APPLY: " if args.apply else "PLAN: ") + statement)
        if args.apply:
            # MariaDB DDL commits implicitly. Every statement is additive and rerunnable.
            for statement in statements:
                connection.execute(text(statement))
            SecurityRateLimit.__table__.create(connection, checkfirst=True)
            # Match the actual ID type: schema.sql uses UNSIGNED; older ORM installs do not.
            id_type = next(c["type"] for c in inspector.get_columns("destinations") if c["name"] == "id")
            destination_id_type = id_type.compile(dialect=connection.dialect)
            connection.execute(text(f"""CREATE TABLE IF NOT EXISTS destination_embeddings (
                destination_id {destination_id_type} PRIMARY KEY, model_name VARCHAR(255) NOT NULL,
                document TEXT NOT NULL, embedding JSON NOT NULL,
                CONSTRAINT fk_embedding_destination FOREIGN KEY (destination_id)
                    REFERENCES destinations(id) ON DELETE CASCADE,
                INDEX idx_embedding_model (model_name)
            ) ENGINE=InnoDB"""))
            connection.commit()
            print("Hardening applied. Data was not deleted or rewritten.")
        else:
            print("Audit only. Use --apply after a backup and during a maintenance window.")
            for name in missing_tables:
                print(f"PLAN: create {name}")
            if not statements and not missing_tables:
                print("No schema changes needed; hardening is already applied.")


if __name__ == "__main__":
    main()
