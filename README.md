# Mediababa

Mediababa is a mobile-first and desktop-compatible editorial news platform with an automated backend pipeline for category-based source ingestion and story generation.

## What is included

- React/Vite frontend design build (served from root)
- Category filters and search against generated stories
- Admin dashboard UI for manual content actions
- Node.js backend with SQLite for categories, source items, stories, and job runs
- Automated ingestion and story generation pipeline
- Scheduled pipeline execution (cron)

## Tech stack

- Frontend: React, Vite, Tailwind-based styling
- Backend: Node.js, Express, SQLite, node-cron

## Project structure

- index.html (deployed frontend build entry)
- assets/ (deployed frontend build assets)
- backend/ (API + pipeline)
- News Media Website Design/ (frontend source project)
- pages/, src/, docs/ (legacy/static and documentation resources)

## Backend setup

From the project root:

```powershell
cd backend
npm install
npm run init-db
npm run run-pipeline
npm run start
```

Backend runs at:

- http://localhost:4000/api/health

## Run locally

In a second terminal from project root, run the static frontend:

```powershell
python -m http.server 5500
```

Then open:

- http://localhost:5500/index.html

## Frontend source development (optional)

```powershell
cd "News Media Website Design"
npm install
npm run dev
```

## Notes

- Frontend fetches stories from `http://localhost:4000/api` by default (override with `VITE_API_BASE_URL`).
- If backend is unavailable, frontend falls back to built-in sample stories.
- Story generation in this phase is rules-based; next phase should add model-driven generation and moderation workflows.
