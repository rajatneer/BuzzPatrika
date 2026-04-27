import { env } from "../config/env.js";
import { CATEGORY_CONFIG, getCategoryBySlug } from "../config/categories.js";
import { initializeDatabase } from "../db/initDb.js";
import { startJobRun, finishJobRun } from "../repositories/jobRunRepository.js";
import { upsertSourceItem, markSourceItemStatus } from "../repositories/sourceRepository.js";
import { createGeneratedStory } from "../repositories/storyRepository.js";
import { fetchSourceItemsForCategory } from "../services/providerService.js";
import { generateStoryFromSource } from "../services/storyGenerator.js";

initializeDatabase();

export async function runPipeline({ categorySlug = null } = {}) {
  const categories = categorySlug ? [getCategoryBySlug(categorySlug)].filter(Boolean) : CATEGORY_CONFIG;

  if (categories.length === 0) {
    throw new Error(`Unknown category: ${categorySlug}`);
  }

  const stats = {
    categoriesProcessed: 0,
    sourceItemsUpserted: 0,
    storiesCreated: 0,
    failures: 0
  };

  const run = startJobRun({
    jobType: categorySlug ? "pipeline:single" : "pipeline:all",
    categorySlug
  });

  try {
    for (const category of categories) {
      stats.categoriesProcessed += 1;
      const sourceItems = await fetchSourceItemsForCategory(category, env.ingestLimitPerCategory);

      for (const sourceItem of sourceItems) {
        const sourceItemId = Number(upsertSourceItem(sourceItem));
        stats.sourceItemsUpserted += 1;

        const storedSourceItem = {
          ...sourceItem,
          id: sourceItemId
        };

        const story = generateStoryFromSource(storedSourceItem, {
          autoPublish: env.autoPublish
        });

        createGeneratedStory(story);
        markSourceItemStatus(sourceItemId, "generated");
        stats.storiesCreated += 1;
      }
    }

    finishJobRun({
      jobRunId: run.id,
      status: "success",
      message: "Pipeline completed",
      stats
    });

    return stats;
  } catch (error) {
    stats.failures += 1;

    finishJobRun({
      jobRunId: run.id,
      status: "failed",
      message: error.message,
      stats
    });

    throw error;
  }
}
