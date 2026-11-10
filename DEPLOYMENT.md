# Travellant deployment

Use Python 3.12 and PostgreSQL 16+ or a maintained MariaDB/MySQL server. The frontend uses Node.js and Vite. The hosted deployment uses Supabase PostgreSQL; local MariaDB remains supported.

The current local database has already been migrated, indexed and restricted. The native API runs on port 8001; see [local database notes](backend/LOCAL_DATABASE.md). The local `.env` points the frontend to that API.

## Upgrade an existing installation

For the hosted PostgreSQL database, follow [the Supabase migration instructions](backend/SUPABASE_MIGRATION.md). The steps below apply to MariaDB/MySQL.

1. Back up the database and pause API writes. Keep the old Chroma volume as a rollback backup.
2. Create a fresh Python environment and install `backend/requirements.txt`. Do not reuse the old environment: it retains removed vulnerable packages.
3. Copy `backend/.env.example` to an untracked `backend/.env`, or configure equivalent environment variables. Preserve your real database connection details.
4. From `backend`, run `python harden_database.py` with migration credentials. It prints counts and a change plan, without personal records. Resolve any reported duplicates or invalid values; the script never deletes or rewrites user data.
5. Run `python harden_database.py --apply` during the maintenance window. It adds constraints, indexes, shared rate-limit storage and destination embedding storage. MariaDB DDL commits implicitly; take a backup first. The migration is rerunnable after a partial DDL failure.
   Then run `python migrate_planner.py` to review the planner v2 additions and `python migrate_planner.py --apply` with migration credentials. This adds account planning details, embedding revisions, planning-request storage and foreign-key indexes. Existing users and trips are preserved.
6. Use `python seed_destinations.py` to populate the destination embedding index. Existing destination rows are preserved unless you explicitly request `--clear`. First use downloads the configured embedding model. Models must support safetensors; remote model code is disabled.
7. Restore the restricted runtime database credentials and start the API. Build/deploy the frontend with `npm ci` and `npm run build`.

The API will return 503 for authentication if the rate-limit table has not been created. It does not bypass request protection when the database is unavailable. Existing access tokens are intentionally invalidated by the stricter claim requirements. Users must sign in again; legacy bcrypt passwords upgrade to Argon2id on successful login. New passwords require 12–128 characters.

Semantic search stores JSON embeddings in the application database. Chroma is no longer installed or served. The old embedding files and `chroma_doc_id` column are preserved for rollback but are unused. Cosine search scans the filtered destination catalog; a larger catalog should use an indexed database vector extension.

## Production configuration

- `APP_ENV=production`
- A unique random `SECRET_KEY` of at least 32 characters. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `CORS_ORIGINS`: exact HTTPS frontend origins, separated by commas.
- `TRUSTED_HOSTS`: exact API hostnames, separated by commas.
- PostgreSQL: set `DATABASE_URL` to the session pooler connection for the dedicated runtime role, with `sslmode=verify-full`, and `DB_SCHEMA=travellant`. Supabase's public root certificate is bundled in the image. See [the Supabase notes](backend/SUPABASE_MIGRATION.md).
- MariaDB/MySQL: set `DB_SSL_CA` to the mounted database CA file. Certificate and hostname verification are enabled. Production refuses root database accounts, missing passwords and missing TLS configuration.
- `ADMIN_USER_IDS`: existing user IDs authorized to ingest destinations. Empty means no API user can ingest. Registration and JWT claims cannot grant administrator privileges.
- `USE_MOCK_LLM=false`, `LLM_PROVIDER=google`, `GOOGLE_MODEL=gemini-2.5-flash` and `GOOGLE_API_KEY` for the tested AI provider. `LLM_PROVIDER=openai`, `OPENAI_MODEL` and `OPENAI_API_KEY` select the alternate structured-output adapter. A provider error never falls back silently. Guided mode is explicitly selected by the user.
- `EMBEDDING_MODEL=all-MiniLM-L6-v2`, `EMBEDDING_REVISION=1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. Re-ingest existing embeddings after upgrading: rows with a different or missing revision are not searched. CPU Torch is pinned to 2.14.1 in the Docker build, and the exact model snapshot is downloaded during the build.
- Set frontend `VITE_API_URL` to the HTTPS API origin.

Terminate HTTPS at the ingress. Keep Uvicorn's `--no-proxy-headers`: application-level rate limits use `TRUSTED_PROXY_NETWORKS` (loopback only by default) and the last untrusted address in the forwarding chain. Direct clients cannot choose their own rate-limit address. Configure this allowlist for the actual deployment ingress, never `0.0.0.0/0`.

On Supabase, apply `supabase/migrations/20261110201831_planner_v2.sql` through an owner/migration connection before starting v2. The migration enables RLS and grants only the dedicated runtime role access to planning requests. Keep the runtime connection on the verified-TLS Session pooler; never use a database-owner or Supabase service-role credential in frontend code.

Configure Render's HTTP health-check path as **`/ready`**. It verifies all required tables/columns/read permissions and AI configuration; it does not spend provider tokens on each health probe. `/health` is a process-only liveness endpoint. Check actual provider behavior with the integration verifier below. The free Render instance can still sleep after inactivity; this platform behavior requires an always-on hosting plan to eliminate.

Planning requests are stored in SQL. The web process performs bounded background work with a five-minute deadline. After a restart, requests without progress for six minutes become failed/retryable; they are never presented as completed. Cancellation is serialized with final saving. Clients keep request IDs and can rediscover an active request after reopening a tab. This is not an external durable job queue; move execution to a queue/worker if the application needs guaranteed automatic replay after process termination.

Use separate database accounts for migrations and runtime. Runtime needs SELECT/INSERT/UPDATE/DELETE on application tables only, including `security_rate_limits` and `destination_embeddings`. It should have no global privileges, GRANT OPTION, FILE, PROCESS, CREATE, ALTER or DROP. Restrict its source host and require TLS. The audit prints permission scopes and TLS status so an operator can check these on the real server.

## Containers

Run `docker compose -f backend/docker-compose.yml up --build -d` after configuring the untracked `backend/.env.docker`. This compose file connects to an existing database; it does not start one.

The image runs as an unprivileged user, excludes environment files and logs, and uses a persistent model cache. Supply the database CA with a read-only mount in production. Migrations and seeding are explicit operator steps and do not run automatically under the runtime account.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm audit`
- `python -m unittest discover -s backend/tests -v` from the repository root, using the new Python environment.
- `python -m pip_audit` in a clean environment with the full runtime requirements installed.
- `python backend/verify_planner.py --base-url http://127.0.0.1:8001` from the repository root, or pass the intended HTTPS API origin explicitly. This creates a disposable account, makes three real AI plans plus one day regeneration, checks exact places/sources, edits and pagination, and removes that account. It uses the configured provider's quota. Do not run concurrent live verifiers.

The security unit tests use an isolated SQLite database and stub model inference/provider calls. To verify the migrated live database without retaining changes, run `python verify_database.py` from `backend`. To check the running local API with a disposable account, run `python smoke_local_backend.py --base-url http://127.0.0.1:8001`; it removes its account and generated records afterward. Do not run those two live checks concurrently. The latest saved audit evidence and verification limits are in `SECURITY_REVIEW.md`.
