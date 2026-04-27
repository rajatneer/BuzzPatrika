import { getDb } from "../db/connection.js";

export function startJobRun({ jobType, categorySlug }) {
  const db = getDb();
  const startedAt = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO job_runs (job_type, category_slug, status, started_at)
    VALUES (?, ?, 'running', ?)
  `).run(jobType, categorySlug || null, startedAt);

  return {
    id: result.lastInsertRowid,
    startedAt
  };
}

export function finishJobRun({ jobRunId, status, message, stats }) {
  const db = getDb();
  const finishedAt = new Date().toISOString();

  db.prepare(`
    UPDATE job_runs
    SET status = ?, message = ?, stats_json = ?, finished_at = ?
    WHERE id = ?
  `).run(status, message || null, stats ? JSON.stringify(stats) : null, finishedAt, jobRunId);
}

export function listJobRuns(limit = 20) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, job_type AS jobType, category_slug AS category, status, message, stats_json AS statsJson, started_at AS startedAt, finished_at AS finishedAt
    FROM job_runs
    ORDER BY started_at DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(Number(limit) || 20, 100)));

  return rows.map((row) => ({
    ...row,
    stats: row.statsJson ? JSON.parse(row.statsJson) : null
  }));
}
