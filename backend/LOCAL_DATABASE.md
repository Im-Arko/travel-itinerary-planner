# Local database — verified 23 October 2026

MariaDB 12.2.2 is running as the existing Windows `MariaDB` service. The local database is `travel_app` on `127.0.0.1:3306`. It accepts local, encrypted connections only.

The updated native backend is running at **http://127.0.0.1:8001**. Port 8000 belongs to another application. The frontend's local `.env` now uses port 8001; restart any already-running frontend development server to pick up that environment change.

## Applied changes

- Unique preference ownership and unique itinerary day numbers.
- Duration, rating, cost and JSON checks, plus the itinerary owner/date index.
- Shared request-limit storage and an embedding table populated for all 65 destinations.
- Runtime SQL access restricted to SELECT, INSERT, UPDATE and DELETE on `travel_app`. Inherited PUBLIC access to the default test schemas was removed.
- Required TLS, a private local certificate authority, and server certificate/hostname verification. Plaintext logins and runtime DDL are rejected.

Existing record counts were preserved: 13 users, 4 preference records, 65 destinations, 12 itineraries and 72 day plans. Live API tests used a disposable account which was removed afterward.

## Local files and administration

`backend/.local-backups/` contains the private pre-migration SQL backup, the original server configuration and administrative execution records. Its Windows permissions restrict access to the current user.

`backend/.local-database-tls/` contains the server certificate/key and public CA certificate. The current user has full access and the MariaDB service has read access. The CA private key is kept separately in `.local-backups/`. Both directories are excluded from Git and Docker. Preserve these files: the Windows service configuration references the TLS files, and `backend/.env` references the CA certificate. Renew the server certificate before 23 October 2027 (India time).

The service configuration remains at `C:/Program Files/MariaDB 12.2/data/my.ini`. Administrative access uses the installed MariaDB client with the existing Windows-integrated root authentication from an administrator process. No administrator password or authentication method was changed. The runtime account intentionally cannot apply future DDL migrations; run those through a database administrator.

This setup is local only. A container or remote deployment needs its own reachable database endpoint, hostname-valid certificates and CA mount; the local TLS directory is deliberately not copied into an image.

## Repeat verification

From `backend`, using `.security-venv/Scripts/python.exe`:

1. `harden_database.py` audits the schema and reports that no changes are needed.
2. `verify_database.py` tests nine database constraints using rolled-back statements and checks record counts/TLS.
3. `smoke_local_backend.py --base-url http://127.0.0.1:8001` checks the running API with a disposable account and real embedding inference. Generation follows the existing mock-provider setting.

Run the two live checks sequentially. The final verification snapshot is `database-verification.json`. The fully installed runtime passes dependency consistency and vulnerability audits (`security-installed-audit.json`).
# Planner v2 update — 11 November 2026

The additive planner migration has been applied after a private database backup. Local records remain at 13 users, 12 itineraries and 72 days; all 65 catalog embeddings were rebuilt with the pinned model revision. Runtime privileges and verified TLS remain restricted. `USE_MOCK_LLM=false` and the existing Google provider configuration are enabled in the ignored local environment. Reproduce the schema upgrade with `migrate_planner.py` using the database owner's migration credentials.
