"""Verify live constraints with rolled-back writes; never prints personal records."""
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from app.database.session import engine


def main():
    cases = [
        ("preference duration", "UPDATE user_preferences SET trip_duration=31 ORDER BY id LIMIT 1", {4025, 3819}),
        ("interest JSON", "UPDATE user_preferences SET interests='invalid-json' ORDER BY id LIMIT 1", {4025, 3819}),
        ("itinerary duration", "UPDATE itineraries SET duration_days=0 ORDER BY id LIMIT 1", {4025, 3819}),
        ("rating", "UPDATE itineraries SET rating=6 ORDER BY id LIMIT 1", {4025, 3819}),
        ("itinerary JSON", "UPDATE itineraries SET full_itinerary='invalid-json' ORDER BY id LIMIT 1", {4025, 3819}),
        ("day number", "UPDATE itinerary_days SET day_number=31 ORDER BY id LIMIT 1", {4025, 3819}),
        ("negative cost", "UPDATE itinerary_days SET estimated_cost=-1 ORDER BY id LIMIT 1", {4025, 3819}),
        ("duplicate preferences", "INSERT INTO user_preferences (user_id, trip_duration) SELECT user_id, trip_duration FROM user_preferences ORDER BY id LIMIT 1", {1062}),
        ("duplicate days", "INSERT INTO itinerary_days (itinerary_id,day_number) SELECT itinerary_id,day_number FROM itinerary_days ORDER BY id LIMIT 1", {1062}),
    ]
    with engine.connect() as connection:
        if connection.dialect.name != "mysql":
            raise SystemExit("This verifier targets MariaDB/MySQL")
        tables = ("users", "user_preferences", "destinations", "itineraries", "itinerary_days", "refresh_tokens", "destination_embeddings")
        before = {name: connection.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar_one() for name in tables}
        if any(before[name] == 0 for name in ("user_preferences", "itineraries", "itinerary_days")):
            raise SystemExit("Existing preferences, itineraries and days are needed for rollback-only constraint checks")
        for label, sql, expected_codes in cases:
            savepoint = connection.begin_nested()
            try:
                connection.execute(text(sql))
            except DBAPIError as exc:
                if exc.orig.args[0] not in expected_codes:
                    raise
                print(f"PASS: {label} rejected by the database")
            else:
                raise AssertionError(f"Database accepted invalid {label}")
            finally:
                savepoint.rollback()
        connection.rollback()
        after = {name: connection.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar_one() for name in tables}
        assert before == after, "Record counts changed"
        print("PASS: all record counts unchanged")
        print("Counts:", after)
        driver = connection.connection.driver_connection
        print("TLS version:", driver._sock.version())
        print("Certificate verification:", driver._sock.context.verify_mode.name)
        print("Hostname verification:", driver._sock.context.check_hostname)


if __name__ == "__main__":
    main()
