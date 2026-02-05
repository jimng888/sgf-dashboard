/**
 * Express app for Cloudflare Workers (D1 + env).
 * Use: createApp(env) then app.listen(3000); export default httpServerHandler({ port: 3000 });
 */
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import ejs from 'ejs';
import { getOrCreateUser, listTickets, createTicket, assignTicket, updateTicketStatus, getUserById } from './lib/db-d1.mjs';
import { D1SessionStore } from './lib/d1-session-store.mjs';
import { login as loginTemplate, dashboard as dashboardTemplate } from './lib/views-embedded.mjs';
import { stylesCss, appJs } from './lib/static-embedded.mjs';

function isAllowedEmail(env, email) {
  const raw = env.ALLOWED_GOOGLE_EMAILS || '';
  const list = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes((email || '').toLowerCase());
}

function createApp(env) {
  const db = env.DB;
  // If D1 is not bound (e.g. first deploy), show setup instructions
  if (!db) {
    const setupApp = express();
    setupApp.get('*', (req, res) => {
      res.type('text/html').send(`
        <h1>SGF Team Dashboard – setup required</h1>
        <p>Connect a D1 database to run the full app:</p>
        <ol>
          <li>In Cloudflare: <strong>Workers & Pages → D1 → Create database</strong> (name: sgf-dashboard-db).</li>
          <li>Run the schema: <code>npx wrangler d1 execute sgf-dashboard-db --remote --file=./schemas/d1-schema.sql</code></li>
          <li>In <code>wrangler.toml</code>, uncomment the [[d1_databases]] block and set <code>database_id</code> to your database ID.</li>
          <li>Set secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, ALLOWED_GOOGLE_EMAILS, SESSION_SECRET.</li>
          <li>Push to Git to redeploy.</li>
        </ol>
        <p>See <strong>docs/add-d1-database-simple.md</strong> for step-by-step.</p>
      `);
    });
    return setupApp;
  }
  const config = {
    google: {
      clientID: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: env.GOOGLE_CALLBACK_URL || 'http://localhost:3851/auth/google/callback',
    },
    sessionSecret: env.SESSION_SECRET || 'change-me',
    openclawUrl: env.OPENCLAW_DASHBOARD_URL || 'http://127.0.0.1:3850',
  };

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackURL,
      },
      async (accessToken, refreshToken, profile, cb) => {
        if (!isAllowedEmail(env, profile?.emails?.[0]?.value)) {
          return cb(new Error('Your Google account is not allowed to access this dashboard.'), null);
        }
        try {
          const user = await getOrCreateUser(db, profile);
          return cb(null, user);
        } catch (e) {
          return cb(e, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(db, id);
      done(null, user || null);
    } catch (e) {
      done(e, null);
    }
  });

  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => { req.env = env; next(); });
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new D1SessionStore(db),
      cookie: {
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Embedded static files
  app.get('/styles.css', (req, res) => { res.type('text/css').send(stylesCss); });
  app.get('/app.js', (req, res) => { res.type('application/javascript').send(appJs); });

  // Custom render using embedded EJS
  const render = (name, data) => {
    const template = name === 'login' ? loginTemplate : dashboardTemplate;
    return ejs.render(template, data);
  };

  function requireAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
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

  app.get('/', requireAuth, async (req, res) => {
    const status = await fetchSystemStatus(config.openclawUrl);
    const tickets = await listTickets(db);
    res.send(render('dashboard', { user: req.user, status, tickets }));
  });

  app.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.send(render('login', { query: req.query || {} }));
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=unauthorized' }),
    (req, res) => res.redirect('/')
  );

  app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) return res.redirect('/');
      res.redirect('/login');
    });
  });

  app.get('/api/status', requireAuth, async (req, res) => {
    const status = await fetchSystemStatus(config.openclawUrl);
    res.json(status);
  });

  app.get('/api/tickets', requireAuth, async (req, res) => {
    const tickets = await listTickets(db);
    res.json(tickets);
  });

  app.post('/api/tickets', requireAuth, async (req, res) => {
    const { customer_phone, order_number, summary, external_id } = req.body || {};
    if (!summary) return res.status(400).json({ error: 'summary required' });
    const ticket = await createTicket(db, {
      external_id,
      customer_phone,
      order_number,
      summary,
      created_by_user_id: req.user.id,
    });
    res.json(ticket);
  });

  app.patch('/api/tickets/:id/assign', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { assigned_to_type, assigned_to_user_id } = req.body || {};
    if (!assigned_to_type || !['bot', 'human'].includes(assigned_to_type)) {
      return res.status(400).json({ error: 'assigned_to_type must be "bot" or "human"' });
    }
    const userId = assigned_to_type === 'human' && assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : null;
    const ticket = await assignTicket(db, id, assigned_to_type, userId);
    if (!ticket) return res.status(404).json({ error: 'ticket not found' });
    res.json(ticket);
  });

  app.patch('/api/tickets/:id/status', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const ticket = await updateTicketStatus(db, id, status);
    if (!ticket) return res.status(404).json({ error: 'ticket not found' });
    res.json(ticket);
  });

  return app;
}

export { createApp };
