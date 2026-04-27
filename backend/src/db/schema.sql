CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS source_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  published_at TEXT,
  market_signal TEXT,
  relevance_score REAL DEFAULT 0,
  raw_payload TEXT,
  ingestion_status TEXT NOT NULL DEFAULT 'ingested',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_source_items_category ON source_items(category_slug);
CREATE INDEX IF NOT EXISTS idx_source_items_published_at ON source_items(published_at);

CREATE TABLE IF NOT EXISTS generated_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_item_id INTEGER,
  category_slug TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  story_body TEXT NOT NULL,
  tags_json TEXT,
  confidence_score REAL DEFAULT 0,
  generation_model TEXT NOT NULL DEFAULT 'rules-v1',
  generation_status TEXT NOT NULL DEFAULT 'generated',
  editorial_status TEXT NOT NULL DEFAULT 'review_required',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_item_id) REFERENCES source_items(id)
);

CREATE INDEX IF NOT EXISTS idx_generated_stories_category ON generated_stories(category_slug);
CREATE INDEX IF NOT EXISTS idx_generated_stories_editorial_status ON generated_stories(editorial_status);

CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL,
  category_slug TEXT,
  status TEXT NOT NULL,
  message TEXT,
  stats_json TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs(started_at);
