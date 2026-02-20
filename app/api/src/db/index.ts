import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const db = new Database(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      handicap REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS swings (
      id TEXT PRIMARY KEY,
      playerId TEXT NOT NULL,
      club TEXT NOT NULL,
      videoUrl TEXT NOT NULL,
      analyzed BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playerId) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS launch_monitor_data (
      id TEXT PRIMARY KEY,
      swingId TEXT NOT NULL UNIQUE,
      imageUrl TEXT NOT NULL,
      ballSpeed REAL,
      clubSpeed REAL,
      smashFactor REAL,
      carry REAL,
      spinRate REAL,
      extractedRawText TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (swingId) REFERENCES swings(id)
    );

    CREATE TABLE IF NOT EXISTS swing_metrics (
      id TEXT PRIMARY KEY,
      swingId TEXT NOT NULL UNIQUE,
      addressTimeMs INTEGER,
      topTimeMs INTEGER,
      impactTimeMs INTEGER,
      finishTimeMs INTEGER,
      addressAngles TEXT,
      topAngles TEXT,
      impactAngles TEXT,
      finishAngles TEXT,
      estimatedClubSpeed REAL,
      estimatedClubPath TEXT,
      estimatedDistance REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (swingId) REFERENCES swings(id)
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      swingId TEXT NOT NULL,
      goalType TEXT CHECK(goalType IN ('Ideal', 'Playable')),
      drills TEXT,
      aiReview TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (swingId) REFERENCES swings(id)
    );
    
    CREATE TABLE IF NOT EXISTS toro_baselines (
      id TEXT PRIMARY KEY,
      club TEXT NOT NULL,
      addressAngles TEXT,
      topAngles TEXT,
      impactAngles TEXT,
      finishAngles TEXT
    );
  `);

  console.log("Database schema initialized.");
};

export function setupDB() {
  initSchema();
  const playerStmt = db.prepare('SELECT count(*) as count FROM players');
  const result = playerStmt.get() as { count: number };

  if (result.count === 0) {
    const insert = db.prepare('INSERT INTO players (id, name, handicap) VALUES (?, ?, ?)');
    insert.run('usr_12345', 'Guest Golfer', 15.0);
    console.log("Inserted dummy user: Guest Golfer");
  }
}
