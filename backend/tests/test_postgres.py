"""PostgreSQL portability and fail-closed connection configuration."""
import os
os.environ["APP_ENV"] = "test"
os.environ["SECRET_KEY"] = "test-only-C2j8rNV7my5WqZ9Hk3LBd6F4tsX0pA1u"

import unittest
from unittest.mock import patch
from sqlalchemy.dialects import mysql, postgresql, sqlite
from sqlalchemy.schema import CreateTable
from backend.app.config import Settings
from backend.app.database.connection import create_database_engine
from backend.app.database.models import Base


class PostgreSQLTests(unittest.TestCase):
    def settings(self, **values):
        return Settings(_env_file=None, **values)

    def test_postgres_url_and_secret_redaction(self):
        settings = self.settings(DATABASE_URL="postgres://app:private-password@pooler.example:5432/postgres")
        self.assertEqual(settings.database_url.drivername, "postgresql+psycopg")
        self.assertNotIn("private-password", repr(settings))
        self.assertNotIn("private-password", str(settings.database_url))

    def test_reject_invalid_urls_and_unverified_remote_tls(self):
        for url in ("not-a-url", "mysql://app:pass@host/db", "postgres://app:pass@host/db?sslmode=require", "postgres://app:pass@host/db?sslmode=disable"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.settings(DATABASE_URL=url)

    def test_production_requires_dedicated_runtime_role(self):
        for name in ("postgres", "postgres.project", "root", "supabase_admin"):
            with self.subTest(role=name), self.assertRaises(ValueError):
                self.settings(app_env="production", cors_origins="https://example.com", DATABASE_URL=f"postgres://{name}:pass@pooler.example/postgres")
        self.settings(app_env="production", cors_origins="https://example.com", DATABASE_URL="postgres://travellant_app.project:pass@pooler.example/postgres")

    def test_verified_tls_bounded_pool_and_private_schema(self):
        settings = self.settings(DATABASE_URL="postgres://app:pass@pooler.example/postgres")
        with patch("backend.app.database.connection.create_engine") as create:
            create_database_engine(settings)
            options = create.call_args.kwargs
        self.assertEqual(options["connect_args"]["sslmode"], "verify-full")
        self.assertTrue(options["connect_args"]["sslrootcert"])
        self.assertIsNone(options["connect_args"]["prepare_threshold"])
        self.assertEqual(options["execution_options"]["schema_translate_map"], {None: "travellant"})
        self.assertEqual(options["pool_size"] + options["max_overflow"], 5)

    def test_schema_compiles_for_all_supported_databases(self):
        for dialect in (postgresql.dialect(), mysql.dialect(), sqlite.dialect()):
            with self.subTest(dialect=dialect.name):
                statements = "\n".join(str(CreateTable(table).compile(dialect=dialect)) for table in Base.metadata.sorted_tables)
                self.assertIn("ck_itin_json", statements)
                if dialect.name == "postgresql":
                    self.assertIn("full_itinerary IS JSON", statements)
                    self.assertNotIn("json_valid(", statements.lower())
                else:
                    self.assertIn("json_valid(full_itinerary)", statements.lower())

    def test_readiness_fails_closed_without_leaking_database_errors(self):
        from fastapi.testclient import TestClient
        from sqlalchemy.exc import OperationalError
        from backend.app.main import app
        with TestClient(app) as client, patch("backend.app.main.engine.connect", side_effect=OperationalError("private server", {}, Exception("private password"))):
            response = client.get("/ready")
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("private", response.text)
            self.assertEqual(client.get("/health").status_code, 200)


if __name__ == "__main__":
    unittest.main()
