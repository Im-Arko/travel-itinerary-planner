# [TRAVELLANT](https://travellant-front.onrender.com/)

A travel itinerary planner with a React frontend and a FastAPI backend. Personalized itineraries use semantic destination search and either the built-in mock generator or OpenAI. The hosted application currently uses the mock generator.

The database is hosted on [Supabase](https://supabase.com/), with the existing local data restored into a private PostgreSQL schema. The backend and frontend are hosted on [Render](https://render.com/). Railway is no longer used by the hosted application.

Run `npm ci` and `npm run dev` for the frontend. Backend setup and the required database hardening migration are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

The interface uses local SVG interest artwork and self-hosted travel typography: Manrope for UI text, Caveat for handwritten accents, Alfa Slab One for retro headings, and Saira Stencil One for stamps. Font licenses are included in `public/fonts`.
