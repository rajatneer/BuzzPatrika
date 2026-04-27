import Database from "better-sqlite3";
import { env } from "../config/env.js";

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(env.databasePath);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
  }

  return dbInstance;
}
