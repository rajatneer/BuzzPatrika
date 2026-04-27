# Mediababa Backend (Phase 1)

Backend foundation for automated category-based news ingestion and story generation.

## Features in this phase

- SQLite schema for categories, source items, generated stories, and job runs
- Category-configured ingestion flow
- Optional NewsAPI and Alpha Vantage integrations (via env keys)
- Auto story generation pipeline (rules-based starter implementation)
- Public APIs for health, categories, stories, and pipeline jobs
- Cron scheduler for periodic ingestion/generation

## Setup

1. Copy `.env.example` to `.env` and add API keys if available.
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
- `GET /api/stories?category=tech&q=ai&status=published&limit=20`
- `GET /api/jobs?limit=20`
- `POST /api/pipeline/run` with optional JSON body: `{ "category": "tech" }`

## Notes

- Without external API keys, the service falls back to deterministic mock source items so the pipeline remains testable.
- This is phase-1 infrastructure. Next phases should add LLM-based generation, moderation checks, and frontend binding.
