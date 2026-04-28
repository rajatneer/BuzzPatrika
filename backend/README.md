# Mediababa Backend (Phase 1)

Backend foundation for automated category-based news ingestion and story generation.

## Features in this phase

- SQLite schema for categories, source items, generated stories, and job runs
- Category-configured ingestion flow
- Optional NewsAPI, GNews, and Alpha Vantage integrations (via env keys)
- Auto story generation pipeline (rules-based starter implementation)
- Public APIs for health, categories, stories, and pipeline jobs
- Cron scheduler for periodic ingestion/generation

## Setup

1. Copy `.env.example` to `.env` and add API keys if available.
    - Free-plan safe defaults are now included:
       - `SCHEDULER_CRON=0 * * * *`
       - `NEWS_API_DAILY_REQUEST_LIMIT=25`
      - `GNEWS_DAILY_REQUEST_LIMIT=25`
       - `ALPHA_VANTAGE_DAILY_REQUEST_LIMIT=25`
       - `PROVIDER_CACHE_TTL_HOURS=12`
2. Install dependencies:

   npm install

3. Start service:

   npm run start

## Useful scripts

- `npm run init-db` initializes schema and category seeds.
- `npm run run-pipeline` executes one ingestion+generation run immediately.
- `npm run dev` runs server in watch mode.

## API endpoints

- `GET /api/health`
- `GET /api/categories`
- `GET /api/stories?country=in&category=tech&tag=ai&location=india&minCredibility=0.7&q=market&status=published&limit=20&maxAgeDays=7`
- `GET /api/jobs?limit=20`
- `GET /api/provider-usage`
- `POST /api/pipeline/run` with optional JSON body: `{ "country": "in", "category": "tech" }`

## Story metadata

Each generated story now includes metadata fields designed for SEO and filtering:

- `headline` + `slug` (SEO URL key)
- `authorName` and `organizationName`
- `publishedAt` and `updatedAt`
- `category` and `tags`
- `location` and `countryCode`
- `sourceCredibilityScore`
- `featuredMediaUrl`

## Notes

- Stories are filtered to recent updates only (last 7 days max by default via `STORIES_MAX_AGE_DAYS`).
- Country-aware ingestion defaults to India (`in`) and can be overridden per pipeline run.
- Provider calls are capped per UTC day using `*_DAILY_REQUEST_LIMIT` values, so free-plan quotas are not exceeded.
- NewsAPI and GNews are both used as primary live-news providers (when keys are configured).
- When NewsAPI/GNews/Alpha Vantage are unavailable or rate-limited, Google News RSS is used as the live-news fallback.
- This is phase-1 infrastructure. Next phases should add LLM-based generation, moderation checks, and frontend binding.
