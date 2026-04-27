import { getDb } from "../db/connection.js";

export function createGeneratedStory(story) {
  const db = getDb();

  if (story.sourceItemId != null) {
    const existing = db
      .prepare("SELECT id FROM generated_stories WHERE source_item_id = ? LIMIT 1")
      .get(story.sourceItemId);

    if (existing) {
      db.prepare(`
        UPDATE generated_stories
        SET
          category_slug = @categorySlug,
          headline = @headline,
          summary = @summary,
          story_body = @storyBody,
          tags_json = @tagsJson,
          confidence_score = @confidenceScore,
          generation_model = @generationModel,
          generation_status = @generationStatus,
          editorial_status = @editorialStatus,
          published_at = @publishedAt
        WHERE source_item_id = @sourceItemId
      `).run(story);

      return existing.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO generated_stories (
      source_item_id,
      category_slug,
      headline,
      summary,
      story_body,
      tags_json,
      confidence_score,
      generation_model,
      generation_status,
      editorial_status,
      published_at
    ) VALUES (
      @sourceItemId,
      @categorySlug,
      @headline,
      @summary,
      @storyBody,
      @tagsJson,
      @confidenceScore,
      @generationModel,
      @generationStatus,
      @editorialStatus,
      @publishedAt
    )
  `).run(story);

  return result.lastInsertRowid;
}

export function listStories({ category, q, status = "published", limit = 20 }) {
  const db = getDb();

  const conditions = [];
  const values = [];

  if (status) {
    conditions.push("gs.editorial_status = ?");
    values.push(status);
  }

  if (category) {
    conditions.push("gs.category_slug = ?");
    values.push(category);
  }

  if (q) {
    conditions.push("(gs.headline LIKE ? OR gs.summary LIKE ? OR gs.story_body LIKE ?)");
    values.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      gs.id,
      gs.category_slug AS category,
      gs.headline,
      gs.summary,
      gs.story_body AS storyBody,
      gs.tags_json AS tagsJson,
      gs.confidence_score AS confidenceScore,
      gs.editorial_status AS editorialStatus,
      gs.published_at AS publishedAt,
      si.source_url AS sourceUrl,
      si.provider AS provider,
      si.published_at AS sourcePublishedAt
    FROM generated_stories gs
    LEFT JOIN source_items si ON si.id = gs.source_item_id
    ${whereClause}
    ORDER BY COALESCE(gs.published_at, gs.created_at) DESC
    LIMIT ?
  `;

  values.push(Math.max(1, Math.min(Number(limit) || 20, 100)));

  const rows = db.prepare(sql).all(...values);
  return rows.map((row) => ({
    ...row,
    tags: row.tagsJson ? JSON.parse(row.tagsJson) : []
  }));
}
