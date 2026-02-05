/**
 * express-session store backed by D1 (Cloudflare).
 * Pass the D1 binding (env.DB) to the constructor.
 */
export class D1SessionStore {
  constructor(db) {
    this.db = db;
  }

  get(sid, callback) {
    this.db.prepare('SELECT session FROM sessions WHERE sid = ? AND expires > ?')
      .bind(sid, Math.floor(Date.now() / 1000))
      .first()
      .then((row) => {
        if (row && row.session) {
          try {
            callback(null, JSON.parse(row.session));
          } catch (e) {
            callback(e);
          }
        } else {
          callback(null, null);
        }
      })
      .catch((err) => callback(err));
  }

  set(sid, session, callback) {
    const expires = Math.floor(Date.now() / 1000) + (session.cookie?.maxAge || 604800) / 1000;
    const data = JSON.stringify(session);
    this.db.prepare('INSERT INTO sessions (sid, session, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET session = excluded.session, expires = excluded.expires')
      .bind(sid, data, expires)
      .run()
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  destroy(sid, callback) {
    this.db.prepare('DELETE FROM sessions WHERE sid = ?').bind(sid).run()
      .then(() => callback(null))
      .catch((err) => callback(err));
  }
}
