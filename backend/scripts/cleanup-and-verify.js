import Database from "better-sqlite3";

const db = new Database("data/mediababa.db");

const deleteStories = db
  .prepare("DELETE FROM generated_stories WHERE source_item_id IN (SELECT id FROM source_items WHERE provider = ?)")
  .run("mock");

const deleteSources = db
  .prepare("DELETE FROM source_items WHERE provider = ?")
  .run("mock");

const providerBreakdown = db
  .prepare(
    `SELECT si.provider AS provider, COUNT(*) AS count
     FROM generated_stories gs
     LEFT JOIN source_items si ON si.id = gs.source_item_id
     WHERE gs.editorial_status = 'published'
     GROUP BY si.provider
     ORDER BY count DESC`
  )
  .all();

const duplicates = db
  .prepare(
    `SELECT headline, COUNT(*) AS count
     FROM generated_stories
     WHERE editorial_status = 'published'
     GROUP BY headline
     HAVING COUNT(*) > 1`
  )
  .all();

console.log("Deleted mock stories:", deleteStories.changes);
console.log("Deleted mock source items:", deleteSources.changes);
console.log("Provider breakdown:", providerBreakdown);
console.log("Duplicate published headlines:", duplicates.length);
