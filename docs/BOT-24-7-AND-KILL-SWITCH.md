# Run the bot 24/7 and use the kill switch

You don’t need your own machine on for the customer-facing bot. Run the OpenClaw gateway (and optional dashboard) on a **cloud host** so it’s always on. Use the **kill switch** on the team dashboard to pause the bot when you need to.

**Why not run the bot on Cloudflare?** The OpenClaw gateway is a long‑running process (WhatsApp/connections, local state). Cloudflare Workers are short, stateless requests. So the gateway has to run on a host (Railway, Render, VPS, etc.); the team dashboard and kill switch run on Cloudflare and tell that host whether the bot is allowed to process messages.

---

## 1. Run the bot indefinitely (no “your machine”)

The **OpenClaw gateway** (port 18789) is the process that actually handles customer messages. It has to run somewhere that’s always reachable.

- **Option A – Cloud host (recommended)**  
  Run the gateway (and optionally the OpenClaw dashboard) on a small always-on host, for example:
  - **Railway** – deploy the gateway (or a small Node app that runs it) and keep it running.
  - **Render / Fly.io / a $5 VPS** – same idea: the “machine” is in the cloud, not your laptop.

  Once it’s deployed and reachable, set **OPENCLAW_DASHBOARD_URL** in the team dashboard Worker to that URL. The team dashboard will then show status and the OpenClaw section when you log in.

- **Option B – This repo only**  
  The team dashboard and kill switch live in **team-dashboard** and run on Cloudflare. The **gateway** and **OpenClaw dashboard** live under **dashboard/** and use the filesystem and a long‑running process. They cannot run inside a Worker. So “host everything on Cloudflare” today means: team dashboard + kill switch on Cloudflare; gateway (and optional OpenClaw dashboard) on a separate cloud host as above.

---

## 2. Kill switch (take the bot down when you need to)

- **Where:** Log in to the team dashboard (e.g. **https://sgf.bestmarketing.com.sg**) and use the **Bot control** section.
- **What it does:** Toggle **Bot is ON** / **Bot is OFF**. When **OFF**, the dashboard stores that in the database. Any service that **checks** this flag (e.g. your gateway) can stop processing messages so the bot is effectively down.

**For the kill switch to actually pause the bot**, the process that handles messages (the gateway, or a wrapper around it) must:

1. Periodically call: **GET https://sgf.bestmarketing.com.sg/api/bot-enabled**  
   (no auth; returns `{ "enabled": true }` or `{ "enabled": false }`).
2. If `enabled` is `false`, stop processing incoming customer messages (e.g. return 503 or skip handling).

So: you run the gateway on a cloud host (so it’s on 24/7), and you add this one check to its code (or to a thin proxy in front of it). When you flip the switch on the dashboard, the next time the gateway checks, it sees `enabled: false` and stops handling messages until you turn it back **ON**.

---

## 3. Summary

| Goal | What to do |
|------|------------|
| Bot runs 24/7 without your machine | Run the OpenClaw gateway (and optional dashboard) on Railway, Render, Fly.io, or a VPS. Point **OPENCLAW_DASHBOARD_URL** at it. |
| Take the bot down when you need to | Use **Bot control** on the team dashboard to set **Bot is OFF**. Ensure the gateway (or its wrapper) calls **GET /api/bot-enabled** and stops processing when `enabled` is false. |
| No extra “machine” of your own | The “machine” is the cloud host; you don’t need your laptop or a home server on. |
