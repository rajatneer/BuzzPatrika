# Shared Hosting API (PHP)

This folder replaces the Node backend for basic shared hosting.

## Endpoints

- GET /api/health
- GET /api/categories
- GET /api/stories (supports maxAgeDays, default 7, capped to 7)
- GET /api/jobs
- GET /api/provider-usage
- POST /api/pipeline/run
- POST /api/analytics/read-click (tracks Read More / Read Full Story clicks)
- GET /api/analytics/read-stats (returns per-story click totals)

## Configuration

1. Copy `config.local.example.php` to `config.local.php`.
2. Set provider keys in `config.local.php`.
3. Keep `storiesMaxAgeDays` at 7 to only publish and return latest weekly news.

## Scheduler (cPanel Cron)

Run every 30 minutes:

```bash
/usr/local/bin/php /home/USERNAME/public_html/api/cron/run_pipeline.php > /dev/null 2>&1
```

Adjust the PHP binary and path based on your hosting account.

## Data Store

- Data file: `api/data/store.json`
- Locking is handled via `flock` for safe concurrent writes.
