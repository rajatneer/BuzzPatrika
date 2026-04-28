import cors from "cors";
import express from "express";
import cron from "node-cron";
import { env } from "./config/env.js";
import { initializeDatabase } from "./db/initDb.js";
import { listCategories } from "./repositories/categoryRepository.js";
import { listJobRuns } from "./repositories/jobRunRepository.js";
import { listStories } from "./repositories/storyRepository.js";
import { getProviderUsageSnapshot } from "./services/providerService.js";
import { runPipeline } from "./jobs/pipeline.js";

initializeDatabase();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "mediababa-backend",
    schedulerCron: env.schedulerCron,
    autoPublish: env.autoPublish,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/categories", (_request, response) => {
  const categories = listCategories().map((category) => ({
    ...category,
    display_name: category.displayName
  }));

  response.json({
    categories
  });
});

app.get("/api/stories", (request, response) => {
  const stories = listStories({
    category: request.query.category,
    country: request.query.country,
    tag: request.query.tag,
    location: request.query.location,
    minCredibility: request.query.minCredibility,
    slug: request.query.slug,
    q: request.query.q,
    status: request.query.status || "published",
    limit: request.query.limit,
    maxAgeDays: request.query.maxAgeDays || env.storiesMaxAgeDays
  });

  response.json({ stories });
});

app.get("/api/jobs", (request, response) => {
  response.json({
    jobs: listJobRuns(request.query.limit)
  });
});

app.get("/api/provider-usage", (_request, response) => {
  response.json(getProviderUsageSnapshot());
});

app.post("/api/pipeline/run", async (request, response) => {
  try {
    const categorySlug = request.body?.category || null;
    const countryCode = request.body?.country || env.defaultCountryCode;
    const stats = await runPipeline({ categorySlug, countryCode });

    response.json({
      message: "Pipeline run completed",
      stats
    });
  } catch (error) {
    response.status(400).json({
      message: error.message
    });
  }
});

cron.schedule(env.schedulerCron, async () => {
  try {
    const stats = await runPipeline({ countryCode: env.defaultCountryCode });
    console.log("Scheduled pipeline run completed", stats);
  } catch (error) {
    console.error("Scheduled pipeline run failed", error.message);
  }
});

app.listen(env.port, () => {
  console.log(`Mediababa backend running on http://localhost:${env.port}`);
});
