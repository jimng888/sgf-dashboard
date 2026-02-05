const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const defaultDataDir = process.env.RAILWAY_ENVIRONMENT ? path.join('/tmp', 'sgf-dashboard-data') : path.join(__dirname, '..', 'data');
const dataDir = process.env.DATA_DIR || defaultDataDir;
const dbPath = path.join(dataDir, 'team-dashboard.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
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
`);

function getOrCreateUser(profile) {
  const { id: google_id, displayName: name, emails, photos } = profile;
  const email = emails?.[0]?.value || '';
  const avatar_url = photos?.[0]?.value || null;
  let row = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
  if (row) {
    db.prepare('UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?')
      .run(email, name, avatar_url, row.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(row.id);
  }
  db.prepare('INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)')
    .run(google_id, email, name, avatar_url);
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
}

function listUsers() {
  return db.prepare('SELECT id, email, name, avatar_url FROM users ORDER BY name').all();
}

function listTickets(limit = 100) {
  return db.prepare(`
    SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email
    FROM tickets t
    LEFT JOIN users u ON t.assigned_to_type = 'human' AND t.assigned_to_user_id = u.id
    ORDER BY t.updated_at DESC
    LIMIT ?
  `).all(limit);
}

function createTicket({ external_id, customer_phone, order_number, summary, created_by_user_id }) {
  const id = db.prepare(`
    INSERT INTO tickets (external_id, customer_phone, order_number, summary, assigned_to_type, created_by_user_id)
    VALUES (?, ?, ?, ?, 'bot', ?)
  `).run(external_id || null, customer_phone || null, order_number || null, summary, created_by_user_id || null).lastInsertRowid;
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
}

function assignTicket(ticketId, assigned_to_type, assigned_to_user_id) {
  db.prepare(`
    UPDATE tickets SET assigned_to_type = ?, assigned_to_user_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(assigned_to_type, assigned_to_user_id || null, ticketId);
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
}

function updateTicketStatus(ticketId, status) {
  db.prepare('UPDATE tickets SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, ticketId);
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
}

module.exports = {
  db,
  getOrCreateUser,
  listUsers,
  listTickets,
  createTicket,
  assignTicket,
  updateTicketStatus,
};
