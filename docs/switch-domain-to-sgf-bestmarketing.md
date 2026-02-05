# Switch from internal.singaporeflorist.com.sg to sgf.bestmarketing.com.sg

Do these in order. Tick each when done.

---

## 1. Google OAuth (required for “Sign in with Google”)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Open your **OAuth 2.0 Client ID** (the one used for this dashboard).
3. **Authorized JavaScript origins**
   - Remove: `https://internal.singaporeflorist.com.sg` (if present).
   - Add: **`https://sgf.bestmarketing.com.sg`**
4. **Authorized redirect URIs**
   - Remove: `https://internal.singaporeflorist.com.sg/auth/google/callback` (if present).
   - Add: **`https://sgf.bestmarketing.com.sg/auth/google/callback`**
5. Click **Save**.

---

## 2. Cloudflare (Worker + domain)

1. Log in to the **Cloudflare account** that has **bestmarketing.com.sg** (or where you manage DNS for it).
2. **Workers & Pages** → open your **sgf-dashboard** Worker.
3. **Custom domain**
   - Remove **internal.singaporeflorist.com.sg** if it’s still there (Settings → Domains & Routes / Triggers → remove the old domain).
   - Add **sgf.bestmarketing.com.sg**: **Settings** → **Domains & Routes** (or **Triggers** → **Custom Domains**) → **Add** → enter **sgf.bestmarketing.com.sg** → Save.
4. **DNS** (in the same account, for **bestmarketing.com.sg**)
   - Add or edit a **CNAME** record:
     - **Name:** `sgf`
     - **Target:** the hostname Cloudflare shows for your Worker (e.g. `sgf-dashboard.workers.dev` or the value they give you).
     - **Proxy:** Proxied (orange cloud) if you want Cloudflare to handle HTTPS.
5. **Secrets / Variables** (same Worker)
   - Set **GOOGLE_CALLBACK_URL** = **`https://sgf.bestmarketing.com.sg/auth/google/callback`**
   - (Edit the variable if it already exists, or add it.)

---

## 3. Railway (only if you still use Railway for this app)

1. Railway dashboard → your **dashboard** service.
2. **Settings** → **Networking** → **Custom domain**
   - Remove **internal.singaporeflorist.com.sg** if listed.
   - Add **sgf.bestmarketing.com.sg** (if you’re serving the app from Railway).
3. **Variables**
   - Set **GOOGLE_CALLBACK_URL** = **`https://sgf.bestmarketing.com.sg/auth/google/callback`**

---

## 4. Local .env (your computer)

If you run the app locally and use a production callback:

1. Open **team-dashboard/.env**.
2. Set **GOOGLE_CALLBACK_URL** = **`https://sgf.bestmarketing.com.sg/auth/google/callback`**  
   (Only if you need to test production login locally; for localhost you usually leave this unset or use `http://localhost:3851/auth/google/callback`.)

---

## 5. Repo / docs (already done)

The docs in this repo have been updated to use **sgf.bestmarketing.com.sg** instead of **internal.singaporeflorist.com.sg**. No code changes were required (the app uses `GOOGLE_CALLBACK_URL` from the environment). If you deploy from Git, just push so any doc changes are in sync.

---

## Checklist

| # | Where            | Action |
|---|------------------|--------|
| 1 | Google Console   | Add `https://sgf.bestmarketing.com.sg` and `https://sgf.bestmarketing.com.sg/auth/google/callback`; remove old internal.singaporeflorist.com.sg URIs. |
| 2 | Cloudflare       | Remove old custom domain; add **sgf.bestmarketing.com.sg**; set GOOGLE_CALLBACK_URL; add CNAME `sgf` in DNS. |
| 3 | Railway (if used)| Update custom domain and GOOGLE_CALLBACK_URL. |
| 4 | Local .env       | Set GOOGLE_CALLBACK_URL if you use production callback locally. |

After this, the app should be reachable at **https://sgf.bestmarketing.com.sg** and “Sign in with Google” should work there.
