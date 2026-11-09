# Supabase database migration

The hosted FastAPI application runs on Render and connects to Supabase PostgreSQL through the IPv4-compatible session pooler. It uses the private `travellant` schema and the dedicated `travellant_app` login. The browser connects only to FastAPI, never directly to application tables.

## Initialize a new database

Apply `supabase/migrations/202611100001_init_travellant.sql` as the project owner. This is an initial migration for an empty schema, not a migration to rerun against the restored deployment. Its generator is `backend/supabase_schema.py`.

The migration adds the application's constraints, indexes, foreign keys, rate-limit storage and embedding storage. It enables row-level security on all eight tables, revokes browser-role access and grants the backend role only table CRUD and sequence usage/read access. The runtime role cannot create objects, change roles or bypass RLS. API authentication and ownership checks enforce each user's access; the backend RLS policy deliberately permits its trusted server role to perform those checks.

Set a unique runtime-role password securely as the project owner. Do not deploy the project-owner connection or a Supabase service-role API key to the backend. Store the runtime URL only in a hosting secret or an ignored environment file:

```dotenv
DATABASE_URL=postgresql://travellant_app.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=verify-full
DB_SCHEMA=travellant
APP_ENV=production
```

Use the host shown in the project's Connect panel; do not infer it from the region. Preserve the backend's existing `SECRET_KEY`, exact HTTPS `CORS_ORIGINS` and explicit `TRUSTED_HOSTS`.

## Restore local data

Back up the local database and pause writes while copying if an exact cutover snapshot is required. From `backend`, use the installed runtime environment:

```powershell
python transfer_to_supabase.py --source-env .env --target-env .local-backups/supabase-runtime.env
```

The tool reads the local MySQL/MariaDB database without modifying it. It refuses a populated target, copies all domain records in a target transaction, compares every copied field against the source, and rolls back on any mismatch. It omits transient rate-limit buckets. Credentials and individual records are never printed.

After a successful restore, the project owner must reset the identity sequences before enabling API writes. The runtime role intentionally lacks the sequence UPDATE privilege needed by `setval`. For each of `destinations`, `users`, `itineraries`, `refresh_tokens`, `user_preferences` and `itinerary_days`, execute this pattern with the corresponding table name:

```sql
SELECT setval(
  pg_get_serial_sequence('travellant.users', 'id'),
  COALESCE((SELECT MAX(id) FROM travellant.users), 1),
  EXISTS(SELECT 1 FROM travellant.users)
);
```

The completed restore contained 65 destinations, 65 embeddings, 13 users, 12 itineraries, 72 day plans and 4 preference records. Every row matched the local source. Identity sequences were reset before cutover.

## Transport security and validation

Connections require certificate and hostname verification (`sslmode=verify-full`). The image includes Supabase's public 2021 root CA, downloaded from [Supabase's certificate endpoint](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). This is a public trust certificate, not a credential. Its SHA-256 is `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa`; it expires on 2031-04-26. `DB_SSL_CA` can override the trust file for a future certificate rotation or another database provider. Other PostgreSQL hosts use the certifi trust bundle by default.

The connection pool is limited to five concurrent connections. Prepared statements are disabled for pooler compatibility, and server-side query/idle-transaction timeouts are 30 seconds. The runtime role's schema permissions prevent unqualified SQL from falling back to an attacker-controlled schema.

Use `/health` for process liveness and `/ready` for database readiness. Readiness verifies read access to all required tables and returns HTTP 503 with no internal error details when unavailable. After deploying, run `python smoke_deployment.py --base-url https://YOUR_BACKEND_HOST` to exercise registration, login, saved preferences, real semantic search and itinerary persistence with a disposable account. The account is deleted afterward.
