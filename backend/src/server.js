import cors from "cors";
import express from "express";
import cron from "node-cron";
import { env } from "./config/env.js";
import { initializeDatabase } from "./db/initDb.js";
import { listCategories } from "./repositories/categoryRepository.js";
import { listJobRuns } from "./repositories/jobRunRepository.js";
import { listStories } from "./repositories/storyRepository.js";
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
  response.json({
    categories: listCategories()
  });
});

app.get("/api/stories", (request, response) => {
  const stories = listStories({
    category: request.query.category,
    q: request.query.q,
    status: request.query.status || "published",
    limit: request.query.limit
  });

  response.json({ stories });
});

app.get("/api/jobs", (request, response) => {
  response.json({
    jobs: listJobRuns(request.query.limit)
  });
});

app.post("/api/pipeline/run", async (request, response) => {
  try {
    const categorySlug = request.body?.category || null;
    const stats = await runPipeline({ categorySlug });

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
    const stats = await runPipeline();
    console.log("Scheduled pipeline run completed", stats);
  } catch (error) {
    console.error("Scheduled pipeline run failed", error.message);
  }
});

app.listen(env.port, () => {
  console.log(`Mediababa backend running on http://localhost:${env.port}`);
});
