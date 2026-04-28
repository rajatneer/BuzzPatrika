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

## GoDaddy Shared Hosting Deployment

Use this mode for basic shared plans that do not support a persistent Node process.

1. Build the frontend from `News Media Website Design` using `npm run build`.
2. Copy the build output (`index.html` and `assets/`) to the hosting web root (`public_html`).
3. Upload the `api/` folder from this repository to `public_html/api`.
4. Copy `api/config.local.example.php` to `api/config.local.php` and set keys.
5. Add a cPanel cron job to execute `api/cron/run_pipeline.php` every 30 minutes.

Example cron command:

```bash
/usr/local/bin/php /home/USERNAME/public_html/api/cron/run_pipeline.php > /dev/null 2>&1
```

## Notes

- Frontend uses same-origin `/api` by default (override with `VITE_API_BASE_URL`).
- Set `VITE_SITE_URL` during build to your production domain for correct canonical/JSON-LD output.
- Backend `.env` supports daily provider limits for free plans:
	- `NEWS_API_DAILY_REQUEST_LIMIT=25`
	- `GNEWS_DAILY_REQUEST_LIMIT=25`
	- `ALPHA_VANTAGE_DAILY_REQUEST_LIMIT=25`
	- `SCHEDULER_CRON=0 * * * *` (default hourly)
	- `PROVIDER_CACHE_TTL_HOURS=12`
	- `STORIES_MAX_AGE_DAYS=7` (default freshness cap)
- Stories include SEO-focused metadata (`slug`, author/organization, publish/update dates, tags, location, credibility score, featured media).
- The frontend emits dynamic meta tags and JSON-LD (`NewsArticle`/`ItemList`) for better search discoverability.
- API supports metadata-aware filtering via `tag`, `location`, and `minCredibility` query parameters.
- API exposes provider limit usage via `/api/provider-usage` for admin dashboards.
- If primary API providers are rate-limited, backend falls back to Google News RSS (live).
- Story responses are constrained to the latest news only (max last 7 days).
- Story generation in this phase is rules-based; next phase should add model-driven generation and moderation workflows.
