# Pending Tasks

## P0 - India Trending Must Stay Current On Website
- [ ] Keep India (`country=in`) as the default website feed country.
- [ ] Keep Trending (`category=trending`) as the default website feed section.
- [ ] Ensure refresh actions and auto-refresh continue to pull latest trending India updates.
- [ ] Add a quick smoke test checklist to verify newest trending India stories appear first.

## P0 - Preserve Older Stories After New Updates
- [ ] Stop automatic story list pruning based on short freshness windows.
- [ ] Keep previously published stories visible after new stories are ingested.
- [ ] Ensure API supports optional freshness filtering without forcing it by default.
- [ ] Verify ordering remains newest-first while retaining historical entries.

## P0 - Rotate Exposed API Credentials
- [ ] Revoke and rotate `NEWS_API_KEY`, `GNEWS_API_KEY`, and `ALPHA_VANTAGE_API_KEY` that were found in `backend/.env`.
- [ ] Replace committed secrets with environment-managed values only.
- [ ] Verify `.env` is not tracked and scrub secrets from git history if already pushed.
- [ ] Add a secret-scanning step in CI to prevent future credential leaks.

## P1 - Protect Pipeline Trigger Endpoint
- [ ] Add authentication/authorization to `POST /api/pipeline/run` in `backend/src/server.js`.
- [ ] Add request rate limiting for this endpoint to prevent quota abuse.
- [ ] Restrict accepted inputs (`category`, `country`) with strict validation and allowlists.
- [ ] Return safe error responses without exposing internal details.

## P1 - Restrict CORS Policy
- [ ] Replace `app.use(cors())` with an allowlist-based CORS configuration.
- [ ] Configure allowed origins via environment variables per environment (dev/staging/prod).
- [ ] Block credentialed cross-origin access unless explicitly required.
- [ ] Add a basic integration check to verify disallowed origins are rejected.

## Quality Guardrails (Follow-up)
- [ ] Add test scripts in `backend/package.json` for route security and abuse controls.
- [ ] Add tests covering unauthenticated access to `/api/pipeline/run`.
- [ ] Add tests covering CORS behavior for allowed vs. blocked origins.
