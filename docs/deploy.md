# Deploy & run

## Run locally

```bash
cp .env.example .env   # edit with your Google OAuth and SESSION_SECRET
npm install
npm start
```

Open **http://localhost:3851**. Add `http://localhost:3851` and `http://localhost:3851/auth/google/callback` to your Google OAuth client.

---

## Deploy to Railway

1. Push the repo to GitHub. In [Railway](https://railway.app): **New project** → **Deploy from GitHub** → select repo.
2. In the service: **Variables** — set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (e.g. `https://sgf.bestmarketing.com.sg/auth/google/callback`), `ALLOWED_GOOGLE_EMAILS`, `SESSION_SECRET`, `NODE_ENV=production`.
3. **Settings** → **Networking** → **Generate domain** (or add custom domain).
4. In Google OAuth, add the production origin and redirect URI.

Each push to the connected branch deploys automatically.

---

## Cloudflare in front of Railway (recommended)

Keep the app on Railway; put the domain on Cloudflare:

1. In **Cloudflare** → DNS for your domain, add **CNAME** `internal` → your Railway hostname (e.g. `xxx.up.railway.app`), **Proxied**.
2. In **Railway** → service → **Custom domain** → add `internal.yourdomain.com`.
3. Set `GOOGLE_CALLBACK_URL` and Google OAuth to `https://internal.yourdomain.com/auth/google/callback`.

Push to GitHub → Railway deploys → live at your subdomain.

---

## Full Cloudflare Workers (push → Cloudflare → domain)

To host on Cloudflare so **push to Git** deploys:

1. See **[docs/cloudflare-like-a-kid.md](cloudflare-like-a-kid.md)** for step-by-step (GitHub → Cloudflare → domain).
2. **Build command** in Cloudflare: **`cd worker && npm ci && npx wrangler deploy`**  
   The `worker/` directory has its own `package.json` with **only** Hono and EJS (no Express). The deploy runs from there, so the bundle cannot include `body-parser`/`iconv-lite`. After changing `views/` or `public/`, run `npm run build:worker` at repo root and commit the updated `worker/lib/` files.
3. Optional: use **`npm run deploy:worker`** from repo root (same as the command above).

---

## Troubleshooting

- **redirect_uri_mismatch** — Add the exact callback URL (including port for localhost) to Google OAuth **Authorized redirect URIs**.
- **EADDRINUSE** — Another process is using the port. `kill $(lsof -t -i :3851)` or run with `PORT=3852 npm start`.
- **Railway crash** — Check **Deployments** → **Logs**. Ensure all Variables are set; for read-only filesystem set `DATA_DIR=/tmp/sgf-dashboard-data`.
