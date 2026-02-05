# Full dashboard on Cloudflare (no Railway)

The repo is set up so **sgf.bestmarketing.com.sg** can serve the **full** dashboard (login, tickets, Bot/Me assignment) on Cloudflare Workers. You do **not** need Railway.

## What was added

- **app-worker.mjs** – Express app that runs on Workers (uses D1 and env).
- **worker.js** – Worker entry that runs this app for each request.
- **lib/db-d1.mjs** – Database layer for D1 (async).
- **lib/d1-session-store.mjs** – Session store in D1.
- **lib/views-embedded.mjs**, **lib/static-embedded.mjs** – Views and static files embedded for Workers (no filesystem).
- **schemas/d1-schema.sql** – Includes `sessions` table for the session store.

When you push to Git, Cloudflare builds and deploys this Worker. If D1 is **not** set up yet, the site shows a short setup page. Once D1 and secrets are set, the full dashboard (Google login, tickets) works at **sgf.bestmarketing.com.sg**.

## What you need to do (one-time)

1. **Create a D1 database** in your Cloudflare account (Workers & Pages → D1 → Create database, name: **sgf-dashboard-db**).
2. **Run the schema** so the tables exist:
   ```bash
   npx wrangler d1 execute sgf-dashboard-db --remote --file=./schemas/d1-schema.sql
   ```
3. **Add the database to your Worker**  
   In **wrangler.toml**, uncomment the **[[d1_databases]]** block and set **database_id** to the ID of the database you created (from the D1 page in the dashboard).
4. **Set Worker secrets** (Variables / Secrets for the Worker):
   - **GOOGLE_CLIENT_ID**
   - **GOOGLE_CLIENT_SECRET**
   - **GOOGLE_CALLBACK_URL** = `https://sgf.bestmarketing.com.sg/auth/google/callback`
   - **ALLOWED_GOOGLE_EMAILS** = e.g. `jim@bestmarketing.com.sg,hello@singaporeflorist.com.sg`
   - **SESSION_SECRET** = long random string (e.g. `openssl rand -hex 32`)
   - **OPENCLAW_DASHBOARD_URL** (optional) = URL of your OpenClaw dashboard for “System status”.
5. **Google OAuth**  
   In Google Cloud Console, set **Authorized JavaScript origins** and **Authorized redirect URIs** to **https://sgf.bestmarketing.com.sg** and **https://sgf.bestmarketing.com.sg/auth/google/callback**.
6. **Push to Git**  
   Cloudflare will redeploy. Open **https://sgf.bestmarketing.com.sg** and sign in with Google.

## After that

- **Push to main** → Cloudflare deploys the new version. No Railway.
- **Change views or static files** → Run `npm run build:worker` to regenerate the embedded files, then commit and push.

## Run locally (unchanged)

For local development you still use Node and SQLite:

```bash
cp .env.example .env
npm install
npm start
```

Open **http://localhost:3851**. Local uses **server.js** and **lib/db.js** (SQLite). Cloudflare uses **worker.js** and **app-worker.mjs** with D1.
