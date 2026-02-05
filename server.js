#!/usr/bin/env node
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const { getOrCreateUser, listTickets, createTicket, assignTicket, updateTicketStatus, db } = require('./lib/db');
const { isAllowedEmail } = require('./lib/auth');

const config = {
  port: parseInt(process.env.PORT || '3851', 10),
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || '3851'}/auth/google/callback`,
  },
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  openclawUrl: process.env.OPENCLAW_DASHBOARD_URL || 'http://127.0.0.1:3850',
};

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
    },
    (accessToken, refreshToken, profile, cb) => {
      if (!isAllowedEmail(profile?.emails?.[0]?.value)) {
        return cb(new Error('Your Google account is not allowed to access this dashboard.'), null);
      }
      try {
        const user = getOrCreateUser(profile);
        return cb(null, user);
      } catch (e) {
        return cb(e, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || null);
  } catch (e) {
    done(e, null);
  }
});

const app = express();
if (process.env.GOOGLE_CALLBACK_URL || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production' || !!process.env.GOOGLE_CALLBACK_URL?.startsWith('https'),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

async function fetchSystemStatus() {
  try {
    const res = await fetch(`${config.openclawUrl}/api/status`, { signal: AbortSignal.timeout(5000) });
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
  const status = await fetchSystemStatus();
  const tickets = listTickets();
  res.render('dashboard', { user: req.user, status, tickets });
});

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login', { query: req.query });
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
  const status = await fetchSystemStatus();
  res.json(status);
});

app.get('/api/tickets', requireAuth, (req, res) => {
  res.json(listTickets());
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const { customer_phone, order_number, summary, external_id } = req.body || {};
  if (!summary) return res.status(400).json({ error: 'summary required' });
  const ticket = createTicket({
    external_id,
    customer_phone,
    order_number,
    summary,
    created_by_user_id: req.user.id,
  });
  res.json(ticket);
});

app.patch('/api/tickets/:id/assign', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { assigned_to_type, assigned_to_user_id } = req.body || {};
  const allowed = ['bot', 'human'];
  if (!assigned_to_type || !allowed.includes(assigned_to_type)) {
    return res.status(400).json({ error: 'assigned_to_type must be "bot" or "human"' });
  }
  const userId = assigned_to_type === 'human' && assigned_to_user_id ? parseInt(assigned_to_user_id, 10) : null;
  const ticket = assignTicket(id, assigned_to_type, userId);
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  res.json(ticket);
});

app.patch('/api/tickets/:id/status', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const ticket = updateTicketStatus(id, status);
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  res.json(ticket);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`SGF Team Dashboard → http://127.0.0.1:${config.port}`);
  if (!config.google.clientID || !config.google.clientSecret) {
    console.warn('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for login.');
  }
}).on('error', (err) => {
  console.error('Listen error:', err.message);
  process.exit(1);
});
