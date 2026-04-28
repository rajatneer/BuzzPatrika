import { getDb } from "../db/connection.js";

export function upsertSourceItem(item) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM source_items WHERE external_id = ?")
    .get(item.externalId);

  if (existing) {
    db.prepare(`
      UPDATE source_items
      SET
        provider = @provider,
        country_code = @countryCode,
        category_slug = @categorySlug,
        title = @title,
        summary = @summary,
        source_url = @sourceUrl,
        published_at = @publishedAt,
        market_signal = @marketSignal,
        relevance_score = @relevanceScore,
        raw_payload = @rawPayload,
        ingestion_status = @ingestionStatus
      WHERE external_id = @externalId
    `).run(item);

    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO source_items (
      external_id,
      provider,
      country_code,
      category_slug,
      title,
      summary,
      source_url,
      published_at,
      market_signal,
      relevance_score,
      raw_payload,
      ingestion_status
    ) VALUES (
      @externalId,
      @provider,
      @countryCode,
      @categorySlug,
      @title,
      @summary,
      @sourceUrl,
      @publishedAt,
      @marketSignal,
      @relevanceScore,
      @rawPayload,
      @ingestionStatus
    )
  `).run(item);

  return result.lastInsertRowid;
}

export function markSourceItemStatus(sourceItemId, status) {
  const db = getDb();
  db.prepare("UPDATE source_items SET ingestion_status = ? WHERE id = ?").run(status, sourceItemId);
}
