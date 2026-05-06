const Database = require('better-sqlite3');

const db = new Database('trades.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    asset TEXT,
    result TEXT,
    be_after_result TEXT,
    pnl REAL,
    strategy TEXT,
    account TEXT,
    lotaje REAL,
    commission REAL,
    pnl_net REAL,
    image_before TEXT,
    image_after TEXT,
    updated_at TEXT
  )
`).run();

try {
  db.prepare('ALTER TABLE trades ADD COLUMN updated_at TEXT').run();
} catch (err) {
  const msg = String(err && err.message ? err.message : err);
  if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
    throw err;
  }
}

try {
  db.prepare('ALTER TABLE trades ADD COLUMN be_after_result TEXT').run();
} catch (err) {
  const msg = String(err && err.message ? err.message : err);
  if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
    throw err;
  }
}

module.exports = db;
