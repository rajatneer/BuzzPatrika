import { getDb } from "../db/connection.js";

export function listCategories({ enabledOnly = true } = {}) {
  const db = getDb();
  const whereClause = enabledOnly ? "WHERE enabled = 1" : "";
  return db
    .prepare(`SELECT id, slug, display_name AS displayName, enabled FROM categories ${whereClause} ORDER BY display_name ASC`)
    .all();
}
