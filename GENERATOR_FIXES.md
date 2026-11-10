# Generator audit remediation

Scope: all 39 findings in the 11 November 2026 audit. Existing user data must be preserved. External facts need sources and retrieval times; unavailable facts must remain unknown. No paid hosting subscription is authorized.

The planner was replaced with a source-bound pipeline. The table distinguishes corrected defects from capabilities that still require an external travel-data service or a hosting change. The app exposes those limits rather than inventing facts.

| # | Finding | Implementation / status |
|---|---|---|
| 1 | Mock output advertised as AI | Removed both old mock modules. Actual Gemini structured selection is configured; guided mode is separately labelled. |
| 2 | Geographic qualifier discarded | Full city/region/country survives sentence extraction; multiple qualifiers and country abbreviations are checked. Paris, Texas regression and real-provider checks pass. |
| 3 | Regional aliases point elsewhere | Canonical GeoNames IDs and coordinates replace mock regional profiles. Zurich is resolved independently. |
| 4 | Correct label with wrong body | AI can only return supplied attraction IDs. Server rebuilds every day from those source records and validates place/radius membership. |
| 5 | Dietary/accessibility needs ignored | Stored needs reach selection and daily instructions. Known unsuitable descriptions are filtered; unknown access/allergen safety is explicitly unconfirmed. No promise that an unknown venue meets a medical/access requirement. |
| 6 | Preferences erase safety settings | Partial updates preserve omitted fields; full forms include all saved safety/settings fields. |
| 7 | Fictional destinations accepted | Strict geocoder-name/feature matching; no invented itinerary when a place cannot be resolved. |
| 8 | Filters silently relaxed | Catalog recommendations keep all filters and return a clear no-match response. No first-row fallback. |
| 9 | Invented global costs | Removed random/hard-coded quotes. Unknown admission/accommodation/transport costs remain null. |
| 10 | No live sources | Wikipedia source IDs, coordinates and retrieval times; current cited Google Search research and dated Open-Meteo forecasts. Demolished/private-residence checks added. **Live booking availability, reliable opening-hour verification and allergy/access audits remain unavailable.** |
| 11 | Blank/contradictory plans accepted | Constrained choice schema, exact day numbers, known IDs, uniqueness and pace checks. Unscheduled slots are labelled. Costs are never inferred from a budget style. |
| 12 | Provider retries become 500s | Bounded retries for transient failures; explicit 502/503 for invalid, refused, truncated or unavailable provider output. |
| 13 | Everyone shares proxy rate bucket | Explicit trusted-proxy networks; last untrusted forwarding hop only. Direct-client spoofing tests pass. |
| 14 | Small global catalog | Worldwide city lookup is independent of the 65-row curated catalog. Unknown/sparse-source destinations produce a clear limitation; **coverage is not guaranteed for every place worldwide**. |
| 15 | Missing trip constraints | Dates, arrival/departure windows, origin, group/children, pace, transport and up to six stops. Later stops reserve a transfer day; outbound/transfer tickets are unconfirmed. |
| 16 | No route feasibility checks | Nearby candidates and per-day geographic clustering; walking-distance bounds and map links. **Road routes, public-transit timetables and intercity connections remain unverified estimates; a routing provider is still needed.** |
| 17 | Repeated attractions | Unique source IDs across all chunks/stops; one-day regeneration excludes existing attractions. |
| 18 | Superficial personalization | Interests, notes, safety needs, party, pace and transport are passed to actual AI selection over local source records. |
| 19 | Saved preferences not loaded | Database-backed preferences load before the form initializes; failures are visible/retryable. |
| 20 | Cross-account preference leak | Context snapshots and request storage are scoped to user ID; logout/401 clears sessions. Switching accounts hides the old snapshot immediately. |
| 21 | Vibes treated as a place | Separate confirmed destination and free-text trip notes; blank destination remains a filtered recommendation request. |
| 22 | No Structured Outputs | Gemini JSON schema / alternate OpenAI strict JSON schema, plus independent server validation. |
| 23 | Truncated long trips | At most seven days per AI selection, 4096 output tokens, finish/refusal checks, 1–30 day regressions. |
| 24 | Failed attempts consume trip quota | Five committed successful runs/hour in persistent SQL. Separate abuse limit, failed/cancelled runs not charged, deletion does not reset allowance. |
| 25 | Unclear currency/person basis | Explicit currency and user budget per person/day, with total group budget separate from unknown trip cost. |
| 26 | Validation errors crash React | Array/object error details become readable strings, verified in component/request tests. |
| 27 | No progress/cancellation/request identity | SQL planning requests, progress polling, active-request rediscovery, cancel, five-minute deadline and duplicate prevention. Interrupted requests fail safely after six minutes; background work is not automatically replayed by an external queue. |
| 28 | Expired-token UI remains signed in | 401 clears session and emits an auth-state update; normal routing returns the user to sign-in. |
| 29 | Hidden older trips/favorites | Server totals, filtering and offset pagination for saved trips and catalog search. Tested with 55 saved records. |
| 30 | Hidden useful plan metadata | Budget basis, source/provider, uncertainty, forecast, packing notes and current research displayed. |
| 31 | No notes/rating/day controls | Title/notes/rating editor, day notes/slot edits, guarded reordering and individual day regeneration. Personal edits are labelled; arrival/departure and multi-stop ordering protected. |
| 32 | Zero becomes null | Explicit null checks preserve genuine zero values. |
| 33 | Rating cannot be cleared | PATCH uses supplied fields; explicit null clears rating/notes. |
| 34 | Misleading photos / N+1 | Plan carries a photo of an included attraction, with creator/license/source credits, or an explicitly labelled local SVG. Removed per-card photo lookups and generic destination fallback photos. |
| 35 | Weak readiness / cold startup | `/ready` checks all required columns/read access and AI configuration; Render health-check path confirmed `/ready`. Model snapshot built into image; lightweight ONNX inference replaces the observed 50.7-second Torch cold import. Numerical parity with the original encoder exceeds 0.99999 cosine similarity. **Free Render idle spin-down remains a platform limit.** |
| 36 | Unpinned ML artifacts | Removed the heavy Torch/Transformers runtime; ONNX Runtime/tokenizer versions and exact model SHA are pinned; all 65 local/hosted embeddings rebuilt with that revision, mismatched rows excluded from search. |
| 37 | Two unindexed foreign keys | Both indexes migrated on local MariaDB and Supabase; performance advisor no longer reports unindexed foreign keys. |
| 38 | Missing quality/UI/provider tests and stale docs | 54 backend regressions, 11 interface/request tests, real-provider verifier with disposable account, updated deployment/security/provider/migration instructions. Browser editor timed out; actual visual verification is recorded separately when available. |
| 39 | Dev dependency vulnerabilities | ESLint/toolchain updates and targeted overrides; npm audit reports zero known vulnerabilities. Python installed-environment audit also reports zero. |

## Verification and data preservation

- Backend: `python -m unittest discover -s backend/tests -v` — 54 passed.
- Frontend: typecheck, lint, build, and `npm test` — 11 passed; npm audit zero findings.
- `backend/verify_planner.py` passed against the native API with actual Google responses for Puducherry, Paris/Texas and Zurich, including citations, request identity, source membership, zero budgets, editing, clearing ratings and one-day regeneration. Disposable account and generated trips removed.
- Supabase migration `20261110201831_planner_v2.sql` applied after a private verified backup. Original hosted records: 13 users, 14 itineraries, 86 days; 65 pinned embeddings and 9 tables protected by RLS. Security advisor: no findings. Unused-index information on a small database is not a reason to remove foreign-key indexes.
- Local MariaDB backed up and migrated using the existing Windows-integrated owner. Original local records: 13 users, 12 itineraries, 72 days; runtime permissions/TLS preserved.
- Deployment verification compares the live service commits with this source revision after publication. Render's deployment history records the released commit.
