import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();

export const env = {
  port: Number(process.env.PORT || 4000),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || "./data/mediababa.db"),
  schedulerCron: process.env.SCHEDULER_CRON || "*/20 * * * *",
  ingestLimitPerCategory: Number(process.env.INGEST_LIMIT_PER_CATEGORY || 5),
  autoPublish: String(process.env.AUTO_PUBLISH || "true").toLowerCase() === "true",
  newsApiKey: process.env.NEWS_API_KEY || "",
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || ""
};
