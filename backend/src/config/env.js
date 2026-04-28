import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();
const configuredCountryCode = String(process.env.DEFAULT_COUNTRY_CODE || "in").toLowerCase();
const defaultCountryCode = /^[a-z]{2}$/.test(configuredCountryCode) ? configuredCountryCode : "in";

export const env = {
  port: Number(process.env.PORT || 4000),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || "./data/mediababa.db"),
  schedulerCron: process.env.SCHEDULER_CRON || "0 * * * *",
  ingestLimitPerCategory: Number(process.env.INGEST_LIMIT_PER_CATEGORY || 5),
  storiesMaxAgeDays: Math.min(7, Math.max(1, Number(process.env.STORIES_MAX_AGE_DAYS || 7))),
  autoPublish: String(process.env.AUTO_PUBLISH || "true").toLowerCase() === "true",
  defaultCountryCode,
  newsApiKey: process.env.NEWS_API_KEY || "",
  gNewsApiKey: process.env.GNEWS_API_KEY || "",
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || "",
  newsApiDailyRequestLimit: Math.max(1, Number(process.env.NEWS_API_DAILY_REQUEST_LIMIT || 25)),
  gNewsDailyRequestLimit: Math.max(1, Number(process.env.GNEWS_DAILY_REQUEST_LIMIT || 25)),
  alphaVantageDailyRequestLimit: Math.max(1, Number(process.env.ALPHA_VANTAGE_DAILY_REQUEST_LIMIT || 25)),
  providerCacheTtlHours: Math.max(1, Number(process.env.PROVIDER_CACHE_TTL_HOURS || 12))
};
