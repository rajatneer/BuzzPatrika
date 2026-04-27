import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_CONFIG } from "../config/categories.js";
import { getDb } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initializeDatabase() {
  const db = getDb();
  const schemaPath = path.resolve(__dirname, "./schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  db.exec(schemaSql);

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
