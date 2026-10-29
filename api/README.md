# Shared Hosting API (PHP)

This folder replaces the Node backend for basic shared hosting. Every data source it uses is free.

## Endpoints

- GET /api/health (includes `lastPipelineRunAt`)
- GET /api/categories
- GET /api/stories (also starts a background refresh when the feed is stale)
- GET /api/market (Nifty 50, Sensex, Bank Nifty, USD/INR; cached)
- GET /api/jobs
- GET /api/provider-usage
- POST /api/pipeline/run (public calls run only when stale; send `X-Pipeline-Token` to force)
- POST /api/analytics/read-click
- GET /api/analytics/read-stats

## How freshness works

1. **Cron** runs the pipeline every 10 minutes.
2. **Lazy refresh:** if a visitor loads stories and the last run is older than `staleRefreshMinutes` (default 10), the API sends the response first, then refreshes in the background. Only one run happens at a time.
3. **Frontend** polls stories every 2 minutes and the market ticker every 60 seconds during market hours (9:15–15:30 IST).

Stories keep their original publish time, so older stories never jump back to the top.

## News sources (free)

- Direct publisher RSS feeds per category (`PUBLISHER_FEEDS` in `bootstrap.php`): ET, Business Standard, Livemint, Moneycontrol, Inc42, The Hindu, NDTV, PIB.
- Google News RSS search for broader coverage.
- NewsAPI only if you set `newsApiKey` (its free plan does not allow production sites).

A feed that fails is skipped and logged to `api/logs/api.log`. To change feeds, set `publisherFeeds` in `config.local.php`.

## Market data (free)

The ticker tries these in order and serves the last cached copy if both fail:

1. **Google Sheets (recommended, most reliable).**
   1. Create a Google Sheet with these columns and formulas:

      | symbol | name | price | change | changePercent |
      |---|---|---|---|---|
      | NIFTY | Nifty 50 | `=GOOGLEFINANCE("INDEXNSE:NIFTY_50","price")` | `=GOOGLEFINANCE("INDEXNSE:NIFTY_50","change")` | `=GOOGLEFINANCE("INDEXNSE:NIFTY_50","changepct")` |
      | SENSEX | Sensex | `=GOOGLEFINANCE("INDEXBOM:SENSEX","price")` | `=GOOGLEFINANCE("INDEXBOM:SENSEX","change")` | `=GOOGLEFINANCE("INDEXBOM:SENSEX","changepct")` |
      | BANKNIFTY | Bank Nifty | `=GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","price")` | `=GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","change")` | `=GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","changepct")` |
      | USDINR | USD/INR | `=GOOGLEFINANCE("CURRENCY:USDINR")` | | |

   2. File → Share → Publish to web → choose the sheet → **CSV** → Publish.
   3. Put the CSV link in `marketSheetCsvUrl`.

   Google Finance quotes can be delayed by up to 20 minutes.
2. **Yahoo Finance public chart endpoint.** No key needed, but it is unofficial and may rate-limit.

## Configuration

1. Copy `config.local.example.php` to `config.local.php` on the server.
2. Set `pipelineToken` to a long random string.
3. Optionally set `marketSheetCsvUrl`.

## Scheduler (cPanel Cron)

Run every 10 minutes:

```bash
*/10 * * * * /usr/local/bin/php /home/USERNAME/public_html/api/cron/run_pipeline.php > /dev/null 2>&1
```

## Data store

- Live data lives in `api/data/` (`store.json`, `market.json`). It is not in git, and the deploy workflow never uploads or deletes it.
- `api/data/` and `api/logs/` are blocked from public access by `.htaccess`.
