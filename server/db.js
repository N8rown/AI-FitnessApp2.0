import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function initDb() {
  if (db) return db;

  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Reset tables for schema update (Dev only)
  // await db.exec(`
  //   DROP TABLE IF EXISTS nutrition;
  //   DROP TABLE IF EXISTS workouts;
  //   DROP TABLE IF EXISTS users;
  // `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      height_ft INTEGER,
      height_in INTEGER,
      weight_lbs REAL,
      equipment TEXT,
      goals TEXT,
      experience TEXT
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      plan TEXT, -- JSON string of planned exercises
      actual_data TEXT, -- JSON string of performed exercises
      scheduled_date TEXT,
      completed_date TEXT,
      is_completed BOOLEAN DEFAULT 0,
      blockchain_hash TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS nutrition (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      food_item TEXT,
      calories INTEGER,
      protein INTEGER,
      carbs INTEGER,
      fats INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  return db;
}

export async function getDb() {
  if (!db) await initDb();
  return db;
}