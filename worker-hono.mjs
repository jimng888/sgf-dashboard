/**
 * Cloudflare Worker using Hono (no Express). Google OAuth + D1 sessions + embedded EJS.
 * Run build:worker before deploy so views/static are embedded.
 */
import { Hono } from 'hono';
import ejs from 'ejs';
import { getOrCreateUser, listTickets, createTicket, assignTicket, updateTicketStatus, getUserById } from './lib/db-d1.mjs';
import { login as loginTemplate, dashboard as dashboardTemplate } from './lib/views-embedded.mjs';
import { stylesCss, appJs } from './lib/static-embedded.mjs';

const SESSION_COOKIE = 'connect.sid';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getConfig(env) {
  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: env.GOOGLE_CALLBACK_URL || '',
    },
    openclawUrl: env.OPENCLAW_DASHBOARD_URL || 'http://127.0.0.1:3850',
  };
}

function isAllowedEmail(env, email) {
  const raw = env.ALLOWED_GOOGLE_EMAILS || '';
  const list = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes((email || '').toLowerCase());
}

function getSessionIdFromCookie(request) {
  const cookie = request.header('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

async function loadSession(db, sid) {
  if (!sid) return null;
  const row = await db.prepare('SELECT session FROM sessions WHERE sid = ? AND expires > ?')
    .bind(sid, Math.floor(Date.now() / 1000))
    .first();
  if (!row?.session) return null;
  try {
    return JSON.parse(row.session);
  } catch {
    return null;
  }
}

async function saveSession(db, sid, data) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const sessionJson = JSON.stringify(data);
  await db.prepare(
    'INSERT INTO sessions (sid, session, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET session = excluded.session, expires = excluded.expires'
  )
    .bind(sid, sessionJson, expires)
    .run();
}

async function destroySession(db, sid) {
  if (sid) await db.prepare('DELETE FROM sessions WHERE sid = ?').bind(sid).run();
}

function sessionCookieHeader(sid, maxAge = SESSION_MAX_AGE) {
  const value = encodeURIComponent(sid);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function fetchSystemStatus(configUrl) {
  try {
    const res = await fetch(`${configUrl}/api/status`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return {
      live: data.gateway?.reachable === true,
      sessionsCount: data.sessionsCount,
      message: data.gateway?.reachable ? 'Gateway reachable' : 'Gateway not reachable',
    };
  } catch (e) {
    return { live: false, sessionsCount: null, message: e.message || 'Could not reach OpenClaw dashboard' };
  }
}

function render(name, data) {
  const template = name === 'login' ? loginTemplate : dashboardTemplate;
  return ejs.render(template, data);
}

export function createWorkerApp() {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('env', c.env);
    await next();
  });

  app.get('/styles.css', (c) => c.body(stylesCss, 200, { 'Content-Type': 'text/css' }));
  app.get('/app.js', (c) => c.body(appJs, 200, { 'Content-Type': 'application/javascript' }));

  async function requireAuth(c, next) {
    const db = c.env.DB;
    if (!db) return c.redirect('/login');
    const sid = getSessionIdFromCookie(c.req.raw);
    const session = await loadSession(db, sid);
    const userId = session?.passport?.user;
    if (!userId) return c.redirect('/login');
    const user = await getUserById(db, userId);
    if (!user) return c.redirect('/login');
    c.set('user', user);
    await next();
  }

  app.get('/', async (c) => {
    const db = c.env.DB;
    if (!db) {
      return c.html(`
        <h1>SGF Team Dashboard – setup required</h1>
        <p>Connect a D1 database to run the full app:</p>
        <ol>
          <li>In Cloudflare: <strong>Workers & Pages → D1 → Create database</strong> (name: sgf-dashboard-db).</li>
          <li>Run the schema: <code>npx wrangler d1 execute sgf-dashboard-db --remote --file=./schemas/d1-schema.sql</code></li>
          <li>In <code>wrangler.toml</code>, add the [[d1_databases]] block with <code>binding = "DB"</code> and your <code>database_id</code>.</li>
          <li>Set secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, ALLOWED_GOOGLE_EMAILS, SESSION_SECRET.</li>
          <li>Push to Git to redeploy.</li>
        </ol>
      `, 200);
    }
    const sid = getSessionIdFromCookie(c.req.raw);
    const session = await loadSession(db, sid);
    const userId = session?.passport?.user;
    if (!userId) return c.redirect('/login');
    const user = await getUserById(db, userId);
    if (!user) return c.redirect('/login');
    const config = getConfig(c.env);
    const status = await fetchSystemStatus(config.openclawUrl);
    const tickets = await listTickets(db);
    return c.html(render('dashboard', { user, status, tickets }));
  });

  app.get('/login', async (c) => {
    const db = c.env.DB;
    if (db) {
      const sid = getSessionIdFromCookie(c.req.raw);
      const session = await loadSession(db, sid);
      const userId = session?.passport?.user;
      if (userId) {
        const user = await getUserById(db, userId);
        if (user) return c.redirect('/');
      }
    }
    const url = new URL(c.req.url);
    const query = Object.fromEntries(url.searchParams);
    return c.html(render('login', { query }));
  });

  app.get('/auth/google', (c) => {
    const config = getConfig(c.env);
    if (!config.google.clientId || !config.google.callbackUrl) {
      return c.redirect('/login?error=unauthorized');
    }
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.callbackUrl,
      response_type: 'code',
      scope: 'openid profile email',
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/auth/google/callback', async (c) => {
    const db = c.env.DB;
    const config = getConfig(c.env);
    const code = c.req.query('code');
    if (!db || !config.google.clientId || !config.google.clientSecret || !config.google.callbackUrl || !code) {
      return c.redirect('/login?error=unauthorized');
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return c.redirect('/login?error=unauthorized');
    const tokens = await tokenRes.json();
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) return c.redirect('/login?error=unauthorized');
    const profileData = await userRes.json();
    if (!isAllowedEmail(c.env, profileData.email)) {
      return c.redirect('/login?error=unauthorized');
    }
    const profile = {
      id: profileData.sub,
      displayName: profileData.name || profileData.email,
      emails: [{ value: profileData.email }],
      photos: profileData.picture ? [{ value: profileData.picture }] : [],
    };
    const user = await getOrCreateUser(db, profile);
    const sid = crypto.randomUUID();
    await saveSession(db, sid, { passport: { user: user.id } });
    c.header('Set-Cookie', sessionCookieHeader(sid));
    return c.redirect('/');
  });

  app.get('/logout', async (c) => {
    const db = c.env.DB;
    const sid = getSessionIdFromCookie(c.req.raw);
    if (db && sid) await destroySession(db, sid);
    c.header('Set-Cookie', clearSessionCookie());
    return c.redirect('/login');
  });

  app.get('/api/status', requireAuth, async (c) => {
    const config = getConfig(c.env);
    const status = await fetchSystemStatus(config.openclawUrl);
    return c.json(status);
  });

  app.get('/api/tickets', requireAuth, async (c) => {
    const tickets = await listTickets(c.env.DB);
    return c.json(tickets);
  });

  app.post('/api/tickets', requireAuth, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { customer_phone, order_number, summary, external_id } = body;
    if (!summary) return c.json({ error: 'summary required' }, 400);
    const user = c.get('user');
    const ticket = await createTicket(c.env.DB, {
      external_id,
      customer_phone,
      order_number,
      summary,
      created_by_user_id: user.id,
    });
    return c.json(ticket);
  });

  app.patch('/api/tickets/:id/assign', requireAuth, async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json().catch(() => ({}));
    const { assigned_to_type, assigned_to_user_id } = body;
    if (!assigned_to_type || !['bot', 'human'].includes(assigned_to_type)) {
      return c.json({ error: 'assigned_to_type must be "bot" or "human"' }, 400);
    }
    const userId = assigned_to_type === 'human' && assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : null;
    const ticket = await assignTicket(c.env.DB, id, assigned_to_type, userId);
    if (!ticket) return c.json({ error: 'ticket not found' }, 404);
    return c.json(ticket);
  });

  app.patch('/api/tickets/:id/status', requireAuth, async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const body = await c.req.json().catch(() => ({}));
    const { status } = body;
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return c.json({ error: 'invalid status' }, 400);
    }
    const ticket = await updateTicketStatus(c.env.DB, id, status);
    if (!ticket) return c.json({ error: 'ticket not found' }, 404);
    return c.json(ticket);
  });

  return app;
}
