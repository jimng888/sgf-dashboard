# Put the dashboard on Cloudflare (explained simply)

Imagine your app is a **little robot**.  
You want: when you **push** new instructions (code) to a **box** (Git), **Cloudflare** takes that box, runs your robot, and people can open it at **your domain**.  
Here’s how that works and what to do, step by step.

---

## What is what?

- **Git** = A way to save every version of your code (like “save game” for your project).
- **GitHub** = A website where that saved code lives on the internet. Other services (like Cloudflare) can look at it.
- **Push** = You send your latest code from your computer to GitHub. So the “box” on GitHub has the newest version.
- **Cloudflare** = A place that can **run** your app on the internet. It can watch your GitHub box and, when you push, **rebuild and run** your app.
- **Domain** = The address people type (e.g. `internal.singaporeflorist.com.sg`). You attach this to your app on Cloudflare so the app is reachable at that address.
- **Debug on Cloudflare** = You use the Cloudflare dashboard to see logs, see if the app is running, and change settings (secrets, domain, etc.).

So the flow is:

1. Your code lives in **Git** and you **push** it to **GitHub**.
2. **Cloudflare** is connected to that GitHub repo. When you push, Cloudflare **builds and runs** your app.
3. You attach a **domain** to that app on Cloudflare. Now people (and you) open the app at that domain. You can **debug** using Cloudflare’s dashboard and logs.

---

## One important thing first

Your dashboard app right now uses:

- **Node.js** (the “room” where the app runs)
- **SQLite** (a small database file on disk)

**Cloudflare Workers** (the “room” where Cloudflare runs apps) is different:

- It doesn’t use a normal file database. It uses **D1** (Cloudflare’s database).
- So for “push to Git → Cloudflare runs it” to work **seamlessly**, the app has to be changed **once** to use **D1** instead of SQLite and to run as a **Worker**. After that, the steps below work.

So we have two parts:

1. **Change the app** so it can run on Cloudflare (use D1, run as a Worker).  
   *(If you want, we can do this in the codebase so the same repo works both locally and on Cloudflare.)*

2. **Do the steps below** so that when you push to GitHub, Cloudflare runs that app and you attach your domain.

---

## Step-by-step (after the app is Cloudflare-ready)

Do these in order. Use a grown-up or a friend if you get stuck.

### Step 1: Put your code in a “box” on the internet (GitHub)

1. Create an account on **GitHub** if you don’t have one: [github.com](https://github.com).
2. Click **“New repository”** (or “New” → “Repository”).
3. Name it something like **`sgf-dashboard`**. Don’t add a README or .gitignore if the project already has them. Click **Create repository**.
4. On your computer, open **Terminal** and go to your project folder:
   ```bash
   cd /Users/jimng/.openclaw/workspace/team-dashboard
   ```
5. If this folder is not yet a Git “box”, run:
   ```bash
   git init
   git add .
   git commit -m "First version of dashboard"
   ```
6. Tell Git where the “box” on the internet is (use **your** GitHub username and repo name):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/sgf-dashboard.git
   git branch -M main
   git push -u origin main
   ```
   When it asks for a password, use a **Personal Access Token** from GitHub (not your normal password).  
   Now your code is on GitHub. The “box” has your app.

---

### Step 2: Tell Cloudflare to watch that box

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (or create an account).
2. In the left menu, click **“Workers & Pages”**.
3. Click **“Create”** (or “Create application”) → **“Worker”** (or “Create Worker”).
4. When it asks how to build it, choose **“Connect to Git”** (or “Deploy with Git”).
5. Sign in to **GitHub** if it asks. Then **choose the repo** you used (e.g. `sgf-dashboard`) and the **branch** (e.g. `main`).
6. Cloudflare will show **build settings**. Usually it will use **Wrangler** and your `wrangler.toml` in the repo. Leave the **root directory** blank if your `wrangler.toml` and `worker.js` are in the root of the repo. Click **Save** or **Deploy**.

Now Cloudflare is **watching** your GitHub box. Every time you **push** to that branch, Cloudflare will **rebuild and run** your app. That’s the “seamless” part.

---

### Step 3: Give Cloudflare the “keys” (secrets)

Your app needs things like Google login keys and a secret. You don’t put these in the code; you put them in Cloudflare.

1. In Cloudflare, open your **Worker** (your dashboard app).
2. Go to **Settings** → **Variables and Secrets** (or **Secrets**).
3. Add each of these as **secret** (so they’re hidden):
   - **GOOGLE_CLIENT_ID** = (from Google)
   - **GOOGLE_CLIENT_SECRET** = (from Google)
   - **GOOGLE_CALLBACK_URL** = `https://YOUR-DOMAIN/auth/google/callback` (we’ll set the domain in Step 4)
   - **ALLOWED_GOOGLE_EMAILS** = e.g. `jim@bestmarketing.com.sg,hello@singaporeflorist.com.sg`
   - **SESSION_SECRET** = a long random string (e.g. from `openssl rand -hex 32`)

Replace **YOUR-DOMAIN** with the domain you’ll use (e.g. `internal.singaporeflorist.com.sg`).  
After you add the domain in Step 4, you can come back and set **GOOGLE_CALLBACK_URL** to the exact URL if needed.

---

### Step 4: Attach your domain so people can open the app

1. In the same Worker in Cloudflare, go to **Settings** → **Domains & Routes** (or **Triggers** → **Custom Domains**).
2. Click **“Add”** or **“Add custom domain”**.
3. Type your domain, e.g. **`internal.singaporeflorist.com.sg`**, and save.
4. Cloudflare will tell you to add a **CNAME** in your DNS (where you manage your domain). Add:
   - **Name:** `internal` (or whatever makes your full domain `internal.singaporeflorist.com.sg`)
   - **Target:** the hostname Cloudflare shows (often something like `sgf-team-dashboard.workers.dev` or a target they give you).

After DNS updates (a few minutes), when people go to **https://internal.singaporeflorist.com.sg**, they’ll get your app. That’s “domain attached directly” to your Worker.

---

### Step 5: Tell Google where your app lives

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your **OAuth client**.
2. Under **Authorized JavaScript origins**, add:  
   `https://internal.singaporeflorist.com.sg`
3. Under **Authorized redirect URIs**, add:  
   `https://internal.singaporeflorist.com.sg/auth/google/callback`
4. Save.

Now “Sign in with Google” will work on your Cloudflare domain.

---

### Step 6: Push = new version on Cloudflare

Whenever you change the code:

1. On your computer:
   ```bash
   cd /Users/jimng/.openclaw/workspace/team-dashboard
   git add .
   git commit -m "Describe what you changed"
   git push origin main
   ```
2. Cloudflare will see the push, **build** again, and **run** the new version. In a minute or two, your domain will show the new app. You can **debug** in the Cloudflare dashboard (logs, deployments, and the domain).

---

## Short recap

| Step | What you do |
|------|-------------|
| 1 | Put code in GitHub (the “box”). |
| 2 | In Cloudflare, connect to that GitHub repo so it watches the box. |
| 3 | In Cloudflare, add secrets (Google keys, SESSION_SECRET, etc.). |
| 4 | In Cloudflare, add your domain and fix DNS (CNAME). |
| 5 | In Google, add your domain and callback URL for login. |
| 6 | Later: push to `main` → Cloudflare builds and runs → you debug on Cloudflare with the domain. |

**Before all this works:** the app must be changed once to run on Cloudflare (use D1 and the Worker entry). After that, everything above is seamless: push to Git → Cloudflare runs it → domain is attached and you can debug there.
