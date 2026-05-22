import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const databasePath = path.join(dataDir, "hoppy.db");

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    originalName TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    data BLOB NOT NULL,
    createdAt TEXT NOT NULL
  );
`);
