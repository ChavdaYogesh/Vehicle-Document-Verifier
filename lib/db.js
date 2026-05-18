import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'documents.db');

const db = new Database(dbPath);

// Check if migration is needed (if vehicles exists but has no user_id)
try {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vehicles'").get();
  if (tableExists) {
    const columns = db.prepare("PRAGMA table_info(vehicles)").all();
    const hasUserId = columns.some(col => col.name === 'user_id');

    if (!hasUserId) {
      console.log('Migrating database: dropping old tables to add user_id...');
      db.exec(`
        DROP TABLE IF EXISTS documents;
        DROP TABLE IF EXISTS vehicles;
        DROP TABLE IF EXISTS users;
      `);
    }
  }
} catch (err) {
  console.error("Migration check failed:", err);
}

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    session_token TEXT,
    fcm_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    license_plate TEXT NOT NULL UNIQUE,
    owner_email TEXT,
    owner_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    type TEXT NOT NULL,
    upload_path TEXT,
    expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'valid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
  );
`);

try {
  const vehicleColumns = db.prepare('PRAGMA table_info(vehicles)').all();
  if (!vehicleColumns.some((col) => col.name === 'owner_fcm_token')) {
    db.exec('ALTER TABLE vehicles ADD COLUMN owner_fcm_token TEXT');
  }
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  if (!userColumns.some((col) => col.name === 'fcm_token')) {
    db.exec('ALTER TABLE users ADD COLUMN fcm_token TEXT');
  }
} catch (err) {
  console.error('FCM token column migration failed:', err);
}

export default db;
