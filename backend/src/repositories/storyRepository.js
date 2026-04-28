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
          slug = @slug,
          headline = @headline,
          summary = @summary,
          story_body = @storyBody,
          author_name = @authorName,
          organization_name = @organizationName,
          location = @location,
          source_credibility_score = @sourceCredibilityScore,
          featured_media_url = @featuredMediaUrl,
          tags_json = @tagsJson,
          confidence_score = @confidenceScore,
          generation_model = @generationModel,
          generation_status = @generationStatus,
          editorial_status = @editorialStatus,
          published_at = @publishedAt,
          updated_at = @updatedAt
        WHERE source_item_id = @sourceItemId
      `).run(story);

      return existing.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO generated_stories (
      source_item_id,
      category_slug,
      slug,
      headline,
      summary,
      story_body,
      author_name,
      organization_name,
      location,
      source_credibility_score,
      featured_media_url,
      tags_json,
      confidence_score,
      generation_model,
      generation_status,
      editorial_status,
      published_at,
      updated_at
    ) VALUES (
      @sourceItemId,
      @categorySlug,
      @slug,
      @headline,
      @summary,
      @storyBody,
      @authorName,
      @organizationName,
      @location,
      @sourceCredibilityScore,
      @featuredMediaUrl,
      @tagsJson,
      @confidenceScore,
      @generationModel,
      @generationStatus,
      @editorialStatus,
      @publishedAt,
      @updatedAt
    )
  `).run(story);

  return result.lastInsertRowid;
}

export function listStories({ category, country, tag, location, minCredibility, slug, q, status = "published", limit = 20, maxAgeDays = 7 }) {
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

  if (country) {
    conditions.push("COALESCE(si.country_code, 'in') = ?");
    values.push(String(country).toLowerCase());
  }

  if (tag) {
    const normalizedTag = String(tag).toLowerCase().replace(/\"/g, "");
    conditions.push("LOWER(COALESCE(gs.tags_json, '')) LIKE ?");
    values.push(`%\"${normalizedTag}\"%`);
  }

  if (location) {
    conditions.push("LOWER(COALESCE(gs.location, '')) LIKE ?");
    values.push(`%${String(location).toLowerCase()}%`);
  }

  if (minCredibility != null && minCredibility !== "") {
    const score = Number(minCredibility);
    if (Number.isFinite(score)) {
      conditions.push("COALESCE(gs.source_credibility_score, gs.confidence_score, 0.5) >= ?");
      values.push(score);
    }
  }

  if (slug) {
    conditions.push("COALESCE(gs.slug, 'story-' || gs.id) = ?");
    values.push(String(slug));
  }

  if (q) {
    conditions.push("(gs.headline LIKE ? OR gs.summary LIKE ? OR gs.story_body LIKE ? OR COALESCE(gs.tags_json, '') LIKE ? OR COALESCE(gs.location, '') LIKE ?)");
    values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const parsedMaxAgeDays = Number(maxAgeDays);
  const freshnessDays = Number.isFinite(parsedMaxAgeDays)
    ? Math.min(7, Math.max(1, Math.floor(parsedMaxAgeDays)))
    : 7;
  const freshnessCutoffIso = new Date(Date.now() - (freshnessDays * 24 * 60 * 60 * 1000)).toISOString();
  conditions.push("COALESCE(si.published_at, gs.published_at, gs.created_at) >= ?");
  values.push(freshnessCutoffIso);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      gs.id,
      gs.category_slug AS category,
      COALESCE(gs.slug, 'story-' || gs.id) AS slug,
      gs.headline,
      gs.summary,
      gs.story_body AS storyBody,
      COALESCE(gs.author_name, CASE
        WHEN si.provider IS NOT NULL THEN si.provider || ' desk'
        ELSE 'BuzzPatrika Desk'
      END) AS authorName,
      COALESCE(gs.organization_name, 'BuzzPatrika') AS organizationName,
      COALESCE(gs.location, CASE COALESCE(si.country_code, 'in')
        WHEN 'in' THEN 'India'
        WHEN 'us' THEN 'United States'
        WHEN 'gb' THEN 'United Kingdom'
        WHEN 'au' THEN 'Australia'
        WHEN 'ca' THEN 'Canada'
        WHEN 'ae' THEN 'United Arab Emirates'
        WHEN 'sg' THEN 'Singapore'
        ELSE UPPER(COALESCE(si.country_code, 'IN'))
      END) AS location,
      COALESCE(gs.source_credibility_score, gs.confidence_score, 0.5) AS sourceCredibilityScore,
      COALESCE(
        NULLIF(TRIM(gs.featured_media_url), ''),
        NULLIF(TRIM(json_extract(si.raw_payload, '$.urlToImage')), ''),
        NULLIF(TRIM(json_extract(si.raw_payload, '$.image')), '')
      ) AS featuredMediaUrl,
      COALESCE(
        NULLIF(TRIM(gs.featured_media_url), ''),
        NULLIF(TRIM(json_extract(si.raw_payload, '$.urlToImage')), ''),
        NULLIF(TRIM(json_extract(si.raw_payload, '$.image')), '')
      ) AS featured_media_url,
      gs.tags_json AS tagsJson,
      gs.confidence_score AS confidenceScore,
      gs.editorial_status AS editorialStatus,
      gs.published_at AS publishedAt,
      COALESCE(gs.updated_at, gs.published_at, gs.created_at) AS updatedAt,
      si.source_url AS sourceUrl,
      si.provider AS provider,
      COALESCE(si.country_code, 'in') AS countryCode,
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
