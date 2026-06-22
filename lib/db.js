import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";

const defaultDbPath = process.env.VERCEL ? "/tmp/calligraphy.sqlite" : "./data/calligraphy.sqlite";
const configuredDbPath = process.env.DATABASE_PATH || defaultDbPath;
const dbPath = isAbsolute(configuredDbPath) ? configuredDbPath : resolve(process.cwd(), configuredDbPath);

const memoryWorks = [];
let db;

function getDb() {
  if (process.env.VERCEL) return null;
  if (db) return db;

  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite");

  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text TEXT NOT NULL,
      script TEXT NOT NULL,
      master TEXT NOT NULL,
      format TEXT NOT NULL,
      prompt TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export function saveWork({ text, script, master, format, prompt, imageUrl }) {
  const createdAt = new Date().toISOString();

  if (process.env.VERCEL) {
    const work = {
      id: Date.now(),
      inputText: text,
      script,
      master,
      format,
      prompt,
      imageUrl,
      createdAt,
    };
    memoryWorks.unshift(work);
    return work;
  }

  const database = getDb();
  const result = database
    .prepare(
      `INSERT INTO works (input_text, script, master, format, prompt, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(text, script, master, format, prompt, imageUrl, createdAt);

  return {
    id: Number(result.lastInsertRowid),
    inputText: text,
    script,
    master,
    format,
    prompt,
    imageUrl,
    createdAt,
  };
}

export function listWorks() {
  if (process.env.VERCEL) {
    return memoryWorks.slice(0, 30);
  }

  return getDb()
    .prepare(
      `SELECT id, input_text as inputText, script, master, format, prompt, image_url as imageUrl, created_at as createdAt
       FROM works
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT 30`
    )
    .all();
}
