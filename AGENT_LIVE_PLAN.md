# Agent Live Plan - Mediababa

## Goal
Deploy a reliable AI-assisted news workflow where latest updates are posted with low token usage, previously posted stories are preserved, and the site goes live via GitHub + GoDaddy under the current hosting plan.

## Scope
1. OpenAI Agent integration for content generation/editing.
2. Low-token architecture and controls.
3. Published stories are never deleted by the agent.
4. Latest news and updates are posted continuously.
5. Production go-live on GitHub + GoDaddy.

## 1) OpenAI Agent To Be Used
- Agent role: `AI Editorial Agent`.
- Responsibility:
  - Rewrite source headlines/summaries into publish-ready short stories.
  - Generate consistent metadata (tags, confidence score, category mapping).
  - Follow strict factual grounding from source payload only.
- Entry point in backend:
  - Add `backend/src/services/aiWriterService.js`.
  - Call service from `backend/src/jobs/pipeline.js` after source ingestion.
- Fallback:
  - If AI call fails, use existing rules-based generator (`storyGenerator.js`) so pipeline never stops.

## 2) Less Token To Be Consumed
- Token optimization strategy:
  - Send minimal prompt context: `title`, `description`, `source`, `category`, `country`.
  - Limit output size:
    - Headline: <= 12 words
    - Summary: <= 35 words
    - Body: <= 120 words
  - Strict JSON response schema only.
  - Process only top-priority stories with AI (example: top 3 to 5 per run).
  - Keep remaining stories rules-based.
- Caching:
  - Cache by `external_id` + source hash.
  - Skip regeneration if unchanged.
- Guardrails:
  - Hard cap output tokens in API request.
  - Timeout + fallback to rules-based text.

## 3) Once News Is Posted, AI Agent Will Not Remove It
- Data retention policy:
  - Never delete records from `generated_stories` during routine updates.
  - New runs only insert new stories or update matching `source_item_id`.
- API behavior:
  - Default stories endpoint should not auto-prune older published items.
  - Keep descending order by publish time so newest appears first.
- Safety rule:
  - Deletion allowed only by explicit admin action (manual workflow), not by agent job.

## 4) Only Latest News And Updates Should Be Posted
- Ingestion policy:
  - Providers prioritized for India trend updates: `GNews`, `NewsData`, `NewsAPI`, fallback `Google RSS`.
  - Run ingestion every 15 to 30 minutes (cron).
- Freshness policy:
  - Ingest recent source items only (for example last 1 to 3 days).
  - Publish newest eligible stories first.
- Feed quality:
  - Exclude non-headline signal providers from trending feed when needed.
  - Deduplicate by stable `external_id` and URL hash.

## 5) Go Live From GitHub + GoDaddy (Current Plan)
- Repository flow:
  - Keep source in GitHub (`main` branch protected recommended).
  - Build frontend from `News Media Website Design`.
- Deploy artifacts to GoDaddy shared hosting:
  - Upload root `index.html` and `assets/`.
  - Upload `api/` folder to `public_html/api`.
  - Configure `api/config.local.php` with production keys.
- Cron on GoDaddy:
  - Schedule `api/cron/run_pipeline.php` every 30 minutes.
- Environment/security:
  - Store API keys only in server config files.
  - Rotate any previously exposed keys.
  - Keep `.env` out of version control.

## Rollout Phases
1. Phase A - Development
- Implement `aiWriterService.js` with token caps + fallback.
- Add feature flag: `AI_AGENT_ENABLED=true/false`.
- Validate schema and DB writes locally.

2. Phase B - Staging Dry Run
- Enable AI for limited categories (`trending` only).
- Run cron for 24 to 48 hours.
- Measure token spend, latency, and story quality.

3. Phase C - Production Go Live
- Enable AI for selected categories.
- Monitor provider usage and generation failures.
- Keep rollback switch to rules-only mode.

## Acceptance Criteria
- AI agent publishes updates without pipeline interruption.
- Average token usage per run stays within budget target.
- No previously published story is removed automatically.
- Latest India trending stories appear at top of feed.
- GitHub to GoDaddy deployment works with cron-driven updates.

## Operational Checklist
- [ ] Add OpenAI key in production config.
- [ ] Enable `AI_AGENT_ENABLED` flag.
- [ ] Set token/output limits.
- [ ] Configure and verify cron run.
- [ ] Verify `/api/health`, `/api/stories`, `/api/provider-usage`.
- [ ] Validate homepage reflects fresh updates after pipeline run.

