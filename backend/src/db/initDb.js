import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_CONFIG } from "../config/categories.js";
import { getDb } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "story";
}

export function initializeDatabase() {
  const db = getDb();
  const schemaPath = path.resolve(__dirname, "./schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  const hasSourceItemsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'source_items' LIMIT 1")
    .get();

  if (hasSourceItemsTable) {
    const sourceItemColumnsBeforeSchema = db.prepare("PRAGMA table_info(source_items)").all();
    const hasCountryCodeBeforeSchema = sourceItemColumnsBeforeSchema.some((column) => column.name === "country_code");
    if (!hasCountryCodeBeforeSchema) {
      db.exec("ALTER TABLE source_items ADD COLUMN country_code TEXT NOT NULL DEFAULT 'in'");
    }
  }

  const hasGeneratedStoriesTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'generated_stories' LIMIT 1")
    .get();

  if (hasGeneratedStoriesTable) {
    const generatedStoryColumnsBeforeSchema = db.prepare("PRAGMA table_info(generated_stories)").all();
    const columnNames = new Set(generatedStoryColumnsBeforeSchema.map((column) => column.name));

    if (!columnNames.has("slug")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN slug TEXT");
    }

    if (!columnNames.has("author_name")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN author_name TEXT");
    }

    if (!columnNames.has("organization_name")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN organization_name TEXT");
    }

    if (!columnNames.has("location")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN location TEXT");
    }

    if (!columnNames.has("source_credibility_score")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN source_credibility_score REAL DEFAULT 0.5");
    }

    if (!columnNames.has("featured_media_url")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN featured_media_url TEXT");
    }

    if (!columnNames.has("updated_at")) {
      db.exec("ALTER TABLE generated_stories ADD COLUMN updated_at TEXT");
    }
  }

  db.exec(schemaSql);

  const sourceItemColumns = db.prepare("PRAGMA table_info(source_items)").all();
  const hasCountryCode = sourceItemColumns.some((column) => column.name === "country_code");
  if (!hasCountryCode) {
    db.exec("ALTER TABLE source_items ADD COLUMN country_code TEXT NOT NULL DEFAULT 'in'");
  }

  db.exec("UPDATE source_items SET country_code = 'in' WHERE country_code IS NULL OR country_code = ''");
  db.exec("CREATE INDEX IF NOT EXISTS idx_source_items_country ON source_items(country_code)");

  db.exec("UPDATE generated_stories SET author_name = 'BuzzPatrika Desk' WHERE author_name IS NULL OR author_name = ''");
  db.exec("UPDATE generated_stories SET organization_name = 'BuzzPatrika' WHERE organization_name IS NULL OR organization_name = ''");
  db.exec("UPDATE generated_stories SET updated_at = COALESCE(updated_at, published_at, created_at)");
  db.exec("UPDATE generated_stories SET source_credibility_score = COALESCE(source_credibility_score, confidence_score, 0.5)");
  db.exec(`
    UPDATE generated_stories
    SET featured_media_url = (
      SELECT COALESCE(
        NULLIF(TRIM(json_extract(si.raw_payload, '$.urlToImage')), ''),
        NULLIF(TRIM(json_extract(si.raw_payload, '$.image')), '')
      )
      FROM source_items si
      WHERE si.id = generated_stories.source_item_id
    )
    WHERE (featured_media_url IS NULL OR TRIM(featured_media_url) = '')
      AND EXISTS (
        SELECT 1
        FROM source_items si
        WHERE si.id = generated_stories.source_item_id
          AND COALESCE(
            NULLIF(TRIM(json_extract(si.raw_payload, '$.urlToImage')), ''),
            NULLIF(TRIM(json_extract(si.raw_payload, '$.image')), '')
          ) IS NOT NULL
      )
  `);

  const rowsNeedingSlug = db
    .prepare("SELECT id, headline FROM generated_stories WHERE slug IS NULL OR slug = ''")
    .all();

  if (rowsNeedingSlug.length > 0) {
    const updateSlug = db.prepare("UPDATE generated_stories SET slug = ? WHERE id = ?");
    const updateSlugTransaction = db.transaction((rows) => {
      for (const row of rows) {
        const slug = `${slugify(row.headline).slice(0, 80)}-${row.id}`;
        updateSlug.run(slug, row.id);
      }
    });

    updateSlugTransaction(rowsNeedingSlug);
  }

  const upsertCategory = db.prepare(`
    INSERT INTO categories (slug, display_name, enabled)
    VALUES (@slug, @displayName, 1)
    ON CONFLICT(slug) DO UPDATE SET display_name = excluded.display_name
  `);

  const transaction = db.transaction((categories) => {
    for (const category of categories) {
      upsertCategory.run(category);
    }
  });

  transaction(CATEGORY_CONFIG);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  initializeDatabase();
  console.log("Database initialized successfully.");
}
