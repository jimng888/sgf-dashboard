-- D1 schema for SGF Team Dashboard (Cloudflare Workers)
-- Run: npx wrangler d1 execute sgf-dashboard-db --remote --file=./schemas/d1-schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  customer_phone TEXT,
  order_number TEXT,
  summary TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  assigned_to_type TEXT NOT NULL DEFAULT 'bot',
  assigned_to_user_id INTEGER REFERENCES users(id),
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to_type, assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC);
