# Security review — 23 October 2026

## Implemented

- Replaced python-jose/passlib with PyJWT and Argon2id. Existing bcrypt hashes upgrade after a successful login; overlong bcrypt inputs are rejected instead of silently truncated.
- Account deletion now requires password confirmation in addition to a valid access token.
- Require signed access tokens with expiry, issued-at, not-before, issuer, audience, subject and token ID claims. Reject malformed subjects, expired/forged tokens and inactive accounts.
- Added database-backed rate limits: 20 auth requests per client IP per 15 minutes; 10 login attempts per account per 15 minutes; 5 generations per user per hour; 30 semantic searches per user per minute. Buckets store keyed hashes of identifiers and use atomic updates across workers.
- Restricted destination ingestion to an operator-controlled admin allowlist. The frontend delegates initial index preparation to generation.
- Bound body size to 64 KiB even without Content-Length, body read time to 15 seconds and query string size to 4 KiB. Login accepts bounded URL-encoded forms only.
- Validate enum values, collection sizes, password/username lengths, ratings, notes and model output before database writes.
- Removed sensitive SQL parameter logging and request input from validation errors. Provider errors and internal failures no longer return raw exceptions or generated content.
- Added exact CORS origins, trusted host checks, no-store/security headers and production configuration checks. Production database TLS verifies both certificate and hostname.
- Added duplicate-preference/day safeguards, duration/rating/cost/JSON constraints, a user/date index, and an audit-first additive migration.
- Removed Chroma and unused LangChain dependencies. The latest Chroma release still has unresolved advisories ([upstream report](https://github.com/chroma-core/chroma/issues/7909), [code injection advisory](https://github.com/advisories/GHSA-f4j7-r4q5-qw2c)). Destination embeddings are JSON data in the application database. No vector HTTP server or user-specified model execution is exposed.
- Updated and pinned direct backend dependencies; patched frontend dependency vulnerabilities and Vite. The old duplicate Python requirements file now references the maintained backend requirements.
- Docker runs unprivileged, drops capabilities, disables arbitrary proxy-header trust and excludes secrets/logs from its build context.
- Removed the checked-in token content and stopped persisting browser tokens in localStorage. Sessions use sessionStorage; scripts on the same origin can still access bearer tokens, so an XSS-free frontend remains necessary.

## Evidence and limits

- 18 security regression tests passed on an isolated SQLite database, including auth, ownership, quotas, request limits, database uniqueness/cascades, generation errors and database embedding search/reingestion.
- TypeScript, ESLint and production frontend build passed. The homepage's SVG artwork and all four font styles were checked in a browser.
- npm audit: zero known vulnerabilities.
- Core Python environment audit: zero known vulnerabilities.
- The full backend runtime is now installed and exercised on Windows/Python 3.12. `pip check` passes; the installed-package audit covers 96 packages and reports zero known vulnerabilities (`backend/security-installed-audit.json`). Real Sentence Transformer inference and semantic search passed. Itinerary generation used the configured mock generator; a paid provider was not called. Re-run audits on the deployment platform.
- MariaDB 12.2.2 was started through Windows service administration, backed up privately, and migrated. Nine rollback-only checks confirmed that invalid JSON, durations, ratings, costs and duplicate preferences/days are rejected. Existing records remain: 13 users, 4 preferences, 65 destinations, 12 itineraries and 72 day plans. All 65 destinations have database embeddings. The audit confirms that no further schema changes are needed.
- The application database account now has only SELECT/INSERT/UPDATE/DELETE on `travel_app`; DDL access and inherited PUBLIC test-schema privileges were removed. Administration uses the existing Windows-integrated root login. Account passwords and administrator authentication were preserved.
- MariaDB now binds to 127.0.0.1 and requires secure transport. A local CA and hostname-valid server certificate were installed; the backend requires certificate and hostname verification. Live checks confirm TLS 1.3 and rejection of plaintext connections. TLS private files and the database backup are access restricted and excluded from Git and Docker.
- A disposable account passed the running API flow: registration, login, preferences, real semantic search, generated itinerary persistence/readback, administrative-ingestion denial and password-confirmed deletion. Its data was removed, and original record counts were rechecked. Verification is saved in `backend/database-verification.json`; local operating notes are in `backend/LOCAL_DATABASE.md`.
- The Docker image was reviewed but not built in this environment. The verified local native backend is running at http://127.0.0.1:8001. Deployment to another host still requires that host’s certificates, database permissions and ingress configuration.
