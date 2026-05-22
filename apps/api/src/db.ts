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
  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    deadline TEXT NOT NULL DEFAULT '',
    isCompleted INTEGER NOT NULL DEFAULT 0,
    isArchived INTEGER NOT NULL DEFAULT 0,
    completedAt TEXT,
    updatedAt TEXT NOT NULL DEFAULT '',
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

const hasColumn = (tableName: string, columnName: string) => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<
    Record<string, unknown>
  >;
  return rows.some((row) => String(row.name) === columnName);
};

const ensureColumn = (
  tableName: string,
  definition: string,
  columnName: string,
) => {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
};

ensureColumn("sections", "sortOrder INTEGER NOT NULL DEFAULT 0", "sortOrder");

db.prepare(
  `INSERT OR IGNORE INTO sections (id, name, description, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)`,
).run(
  "backlog",
  "Backlog",
  "Default section for incoming practice work",
  0,
  new Date().toISOString(),
);

ensureColumn("tasks", "sectionId TEXT NOT NULL DEFAULT 'backlog'", "sectionId");
ensureColumn("tasks", "deadline TEXT NOT NULL DEFAULT ''", "deadline");
ensureColumn("tasks", "isCompleted INTEGER NOT NULL DEFAULT 0", "isCompleted");
ensureColumn("tasks", "isArchived INTEGER NOT NULL DEFAULT 0", "isArchived");
ensureColumn("tasks", "completedAt TEXT", "completedAt");
ensureColumn("tasks", "updatedAt TEXT NOT NULL DEFAULT ''", "updatedAt");

db.exec(`
  WITH ordered_sections AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt ASC, id ASC) - 1 AS rowNumber
    FROM sections
  )
  UPDATE sections
  SET sortOrder = (
    SELECT rowNumber FROM ordered_sections WHERE ordered_sections.id = sections.id
  );

  UPDATE tasks
  SET sectionId = 'backlog'
  WHERE sectionId IS NULL OR sectionId = '';

  UPDATE tasks
  SET updatedAt = createdAt
  WHERE updatedAt IS NULL OR updatedAt = '';
`);
