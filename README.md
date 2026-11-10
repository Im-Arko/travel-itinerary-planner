# [TRAVELLANT](https://travellant-front.onrender.com/)

A travel itinerary planner with a React frontend and a FastAPI backend. The planner confirms real destination IDs, retrieves nearby attraction sources and uses Gemini structured output to arrange those attractions. A separately labelled guided mode works without AI. There is no mock generator in the runtime.

The database is hosted on [Supabase](https://supabase.com/), with the existing local data restored into a private PostgreSQL schema. The backend and frontend are hosted on [Render](https://render.com/). Railway is no longer used by the hosted application.

In Plan a Trip, a confirmed destination takes priority over recommendation filters. Worldwide city lookup uses GeoNames through Open-Meteo, including places outside the curated destination catalog. Ambiguous names require a region/country choice; fictional or unsupported destinations receive a clear error. Pondicherry, Puducherry and Pondy resolve to the same place. Blank-destination recommendations preserve every selected filter.

Plans support dates, arrival/departure windows, up to six stops, party size/children, pace, transport, interests, dietary needs and accessibility requirements. Account preferences load from the database. Planning runs have progress, cancellation, request identity and a five-successful-plans/hour allowance. Saved plans support notes, ratings (including clearing a rating), personal day edits, reordering and individual day regeneration.

Attraction descriptions link to Wikipedia source pages. Current Google Search research includes citations and its Search Suggestions; dated forecasts come from Open-Meteo. Source coverage varies. Opening hours, accessible entrances, food/allergen safety, tickets and accommodation are **not guaranteed or booked**. Prices remain unquoted; a user's currency and per-person/day budget are kept separate from actual costs. Travel legs are clearly labelled geographic estimates. Later stops reserve a transfer day rather than inventing a connection.

Run `npm ci` and `npm run dev` for the frontend. The local API is `http://127.0.0.1:8001`. Backend setup, planner v2 migrations, provider configuration and verification are documented in [DEPLOYMENT.md](DEPLOYMENT.md). The 39-item audit follow-up is in [GENERATOR_FIXES.md](GENERATOR_FIXES.md).

The interface uses local SVG interest artwork and self-hosted travel typography: Manrope for UI text, Caveat for handwritten accents, Alfa Slab One for retro headings, and Saira Stencil One for stamps. Font licenses are included in `public/fonts`.

Semantic search uses the pinned MiniLM model through a small CPU ONNX runtime. It does not load Torch or Transformers at request time.
