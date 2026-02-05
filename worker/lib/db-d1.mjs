/**
 * D1 (Cloudflare) async database layer for the dashboard.
 * All functions take the D1 binding (env.DB) as first argument.
 */

export async function getOrCreateUser(db, profile) {
  const { id: google_id, displayName: name, emails, photos } = profile;
  const email = emails?.[0]?.value || '';
  const avatar_url = photos?.[0]?.value || null;
  let row = await db.prepare('SELECT * FROM users WHERE google_id = ?').bind(google_id).first();
  if (row) {
    await db.prepare('UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?')
      .bind(email, name, avatar_url, row.id).run();
    return (await db.prepare('SELECT * FROM users WHERE id = ?').bind(row.id).first()) || row;
  }
  await db.prepare('INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)')
    .bind(google_id, email, name, avatar_url).run();
  return await db.prepare('SELECT * FROM users WHERE google_id = ?').bind(google_id).first();
}

export async function listTickets(db, limit = 100) {
  const { results } = await db.prepare(`
    SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email
    FROM tickets t
    LEFT JOIN users u ON t.assigned_to_type = 'human' AND t.assigned_to_user_id = u.id
    ORDER BY t.updated_at DESC
    LIMIT ?
  `).bind(limit).all();
  return results || [];
}

export async function getUserById(db, id) {
  return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function createTicket(db, { external_id, customer_phone, order_number, summary, created_by_user_id }) {
  const r = await db.prepare(`
    INSERT INTO tickets (external_id, customer_phone, order_number, summary, assigned_to_type, created_by_user_id)
    VALUES (?, ?, ?, ?, 'bot', ?)
  `).bind(external_id || null, customer_phone || null, order_number || null, summary, created_by_user_id || null).run();
  const id = r.meta.last_row_id;
  return await db.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
}

export async function assignTicket(db, ticketId, assigned_to_type, assigned_to_user_id) {
  await db.prepare('UPDATE tickets SET assigned_to_type = ?, assigned_to_user_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(assigned_to_type, assigned_to_user_id ?? null, ticketId).run();
  return await db.prepare('SELECT * FROM tickets WHERE id = ?').bind(ticketId).first();
}

export async function updateTicketStatus(db, ticketId, status) {
  await db.prepare('UPDATE tickets SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(status, ticketId).run();
  return await db.prepare('SELECT * FROM tickets WHERE id = ?').bind(ticketId).first();
}
