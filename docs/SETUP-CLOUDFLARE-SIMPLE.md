# Set up the dashboard on Cloudflare (simple steps)

Do these **once** so the site works at https://sgf.bestmarketing.com.sg/

---

## Where to type commands

- **In Cursor:** Press **Ctrl+`** (or **Cmd+`** on Mac) to open the **Terminal** at the bottom. Type there and press **Enter**.
- **On Mac without Cursor:** Open **Terminal** (search “Terminal” in Spotlight). Then type: `cd` then a space, then **drag your project folder** into the Terminal window and press **Enter**. Now you’re “in” the project.

---

## Step 1: Log in to Cloudflare (one time)

In the Terminal, type this and press **Enter**:

```bash
cd /Users/jimng/.openclaw/workspace/team-dashboard/worker && npx wrangler login
```

- A browser window will open and ask you to log in to Cloudflare.
- Click **Allow** so Wrangler can use your account.
- When it says “Success”, you can close that tab and go back to the Terminal.

---

## Step 2: Create the database tables

In the same Terminal, type this and press **Enter**:

```bash
cd /Users/jimng/.openclaw/workspace/team-dashboard/worker && npx wrangler d1 execute sgf-dashboard-db --remote --file=../schemas/d1-schema.sql
```

- Wait until it finishes (no error = good).
- This creates the `users`, `tickets`, and `sessions` tables in your D1 database.

---

## Step 3: Deploy the Worker again (with error handling)

In the same Terminal, type this and press **Enter**:

```bash
cd /Users/jimng/.openclaw/workspace/team-dashboard/worker && npx wrangler deploy
```

- Wait until it says “Deployed” and shows a URL.
- Your site will use this new version.

---

## Step 4: Set secrets (if you haven’t already)

1. Go to **https://dash.cloudflare.com**
2. Open **Workers & Pages** → click **sgf-dashboard**.
3. Go to **Settings** → **Variables and Secrets** (or **Variables**).
4. Under **Encrypted variables** / **Secrets**, add:

   - **GOOGLE_CLIENT_ID** = (from Google Cloud Console)
   - **GOOGLE_CLIENT_SECRET** = (from Google Cloud Console)
   - **GOOGLE_CALLBACK_URL** = `https://sgf.bestmarketing.com.sg/auth/google/callback`
   - **ALLOWED_GOOGLE_EMAILS** = your Gmail address (or list of addresses, comma-separated)
   - **OPENCLAW_DASHBOARD_URL** = the full URL of your OpenClaw dashboard (e.g. `https://openclaw.yourdomain.com`). If you leave this unset, the System status card will show “Set OPENCLAW_DASHBOARD_URL…” until you set it.

5. Save.

---

## Step 5: Open your site

Go to: **https://sgf.bestmarketing.com.sg/**

- You should see the login page.
- If you see an error message on the page, copy it and share it so we can fix the next thing.

---

**Summary:** You type the commands in the **Terminal** (bottom of Cursor or the Terminal app). Each time you type a line, press **Enter** and wait for it to finish before typing the next one.
