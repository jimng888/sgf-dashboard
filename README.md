# SGF Team Dashboard

System status, Google login, and ticket assignment (Bot vs you) for the Singapore Florist OpenClaw setup.

## Quick start

```bash
cp .env.example .env
# Edit .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_GOOGLE_EMAILS, SESSION_SECRET

npm install
npm start
```

Open **http://localhost:3851**. Sign in with a Google account listed in `ALLOWED_GOOGLE_EMAILS`.

**Google OAuth:** In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client, add **Authorized redirect URIs**: `http://localhost:3851/auth/google/callback`.

## Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `ALLOWED_GOOGLE_EMAILS` | Yes | Comma-separated emails that can log in |
| `SESSION_SECRET` | Yes | Random string, e.g. `openssl rand -hex 32` |
| `PORT` | No | Default 3851 |
| `GOOGLE_CALLBACK_URL` | Production | e.g. `https://internal.yourdomain.com/auth/google/callback` |
| `OPENCLAW_DASHBOARD_URL` | No | If set, the dashboard shows **OpenClaw** integrated: system status (gateway/sessions), a link to open the OpenClaw dashboard, and recent activity. Run the OpenClaw dashboard (e.g. `node dashboard/server.js`) and expose it at a URL (tunnel or VPS), then set this secret. |

## Bot control (kill switch)

On the dashboard, **Bot control** lets you turn the customer-facing bot **ON** or **OFF**. When OFF, any gateway that checks **GET /api/bot-enabled** will see `enabled: false` and can stop processing messages. See **[docs/BOT-24-7-AND-KILL-SWITCH.md](docs/BOT-24-7-AND-KILL-SWITCH.md)** for running the bot 24/7 on a cloud host and wiring the kill switch.

## Deploy & troubleshoot

See **[docs/deploy.md](docs/deploy.md)** for Railway, Cloudflare, and common fixes.

## Data

SQLite DB at `data/team-dashboard.db` (created on first run). Tables: `users`, `tickets`.
