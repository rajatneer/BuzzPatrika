import { env } from "../config/env.js";
import { CATEGORY_CONFIG, getCategoryBySlug } from "../config/categories.js";
import { initializeDatabase } from "../db/initDb.js";
import { startJobRun, finishJobRun } from "../repositories/jobRunRepository.js";
import { upsertSourceItem, markSourceItemStatus } from "../repositories/sourceRepository.js";
import { createGeneratedStory } from "../repositories/storyRepository.js";
import { fetchSourceItemsForCategory } from "../services/providerService.js";
import { generateStoryFromSource } from "../services/storyGenerator.js";
import { generateStoryWithAI } from "../services/aiWriterService.js";

initializeDatabase();

export async function runPipeline({ categorySlug = null, countryCode = env.defaultCountryCode } = {}) {
  const categories = categorySlug ? [getCategoryBySlug(categorySlug)].filter(Boolean) : CATEGORY_CONFIG;

  if (categories.length === 0) {
    throw new Error(`Unknown category: ${categorySlug}`);
  }

  const stats = {
    categoriesProcessed: 0,
    sourceItemsUpserted: 0,
    storiesCreated: 0,
    aiStoriesCreated: 0,
    failures: 0
  };

  const run = startJobRun({
    jobType: categorySlug ? "pipeline:single" : "pipeline:all",
    categorySlug
  });

  try {
    let aiStoriesUsed = 0;

    for (const category of categories) {
      stats.categoriesProcessed += 1;
      const sourceItems = await fetchSourceItemsForCategory(category, env.ingestLimitPerCategory, countryCode);
      const prioritizedSourceItems = [...sourceItems].sort((a, b) => {
        const scoreA = Number(a.relevanceScore) || 0;
        const scoreB = Number(b.relevanceScore) || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        const timeA = new Date(a.publishedAt || 0).getTime();
        const timeB = new Date(b.publishedAt || 0).getTime();
        return timeB - timeA;
      });

      for (const sourceItem of prioritizedSourceItems) {
        const sourceItemId = Number(upsertSourceItem(sourceItem));
        stats.sourceItemsUpserted += 1;

        const storedSourceItem = {
          ...sourceItem,
          id: sourceItemId
        };

        const shouldUseAi = (
          env.aiAgentEnabled
          && Boolean(env.openAiApiKey)
          && aiStoriesUsed < env.aiMaxStoriesPerRun
          && ["trending", "business", "news"].includes(String(storedSourceItem.categorySlug || ""))
        );

        let story = null;

        if (shouldUseAi) {
          try {
            story = await generateStoryWithAI(storedSourceItem, {
              autoPublish: env.autoPublish && env.aiAutoPublish
            });
            aiStoriesUsed += 1;
            stats.aiStoriesCreated += 1;
          } catch (error) {
            console.warn(`AI generation failed for source ${storedSourceItem.id}: ${error.message}`);
          }
        }

        if (!story) {
          story = generateStoryFromSource(storedSourceItem, {
            autoPublish: env.autoPublish
          });
        }

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
