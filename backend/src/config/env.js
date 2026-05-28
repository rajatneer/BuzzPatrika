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
  storiesMaxAgeDays: Math.max(0, Math.floor(Number(process.env.STORIES_MAX_AGE_DAYS || 0))),
  autoPublish: String(process.env.AUTO_PUBLISH || "true").toLowerCase() === "true",
  aiAgentEnabled: String(process.env.AI_AGENT_ENABLED || "false").toLowerCase() === "true",
  aiAutoPublish: String(process.env.AI_AUTO_PUBLISH || "false").toLowerCase() === "true",
  aiModel: process.env.AI_MODEL || "gpt-4o-mini",
  aiMaxStoriesPerRun: Math.max(0, Number(process.env.AI_MAX_STORIES_PER_RUN || 3)),
  aiMaxOutputTokens: Math.max(80, Number(process.env.AI_MAX_OUTPUT_TOKENS || 180)),
  aiRequestTimeoutMs: Math.max(1000, Number(process.env.AI_REQUEST_TIMEOUT_MS || 12000)),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  defaultCountryCode,
  newsApiKey: process.env.NEWS_API_KEY || "",
  gNewsApiKey: process.env.GNEWS_API_KEY || "",
  newsDataApiKey: process.env.NEWSDATA_API_KEY || "",
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || "",
  newsApiDailyRequestLimit: Math.max(1, Number(process.env.NEWS_API_DAILY_REQUEST_LIMIT || 25)),
  gNewsDailyRequestLimit: Math.max(1, Number(process.env.GNEWS_DAILY_REQUEST_LIMIT || 25)),
  newsDataDailyRequestLimit: Math.max(1, Number(process.env.NEWSDATA_DAILY_REQUEST_LIMIT || 100)),
  alphaVantageDailyRequestLimit: Math.max(1, Number(process.env.ALPHA_VANTAGE_DAILY_REQUEST_LIMIT || 25)),
  providerCacheTtlHours: Math.max(1, Number(process.env.PROVIDER_CACHE_TTL_HOURS || 12))
};
