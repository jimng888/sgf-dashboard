# How to add the database to Cloudflare (simple steps)

Right now your app on Cloudflare is a tiny placeholder. To make the **real** dashboard work (login, tickets), Cloudflare needs a **database**. Cloudflare’s database is called **D1**. Here’s how to create it and connect it, step by step.

---

## Part 1: Create the database in Cloudflare

1. **Open Cloudflare**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) in your browser.
   - Log in if it asks.

2. **Go to D1**
   - On the **left side** of the page, look for a list of things (Overview, Workers & Pages, etc.).
   - Click **“Workers & Pages”**.
   - At the top of that page you might see tabs or a menu. Look for **“D1”** and click it.
   - (If you don’t see D1, try: left menu → **“Workers & Pages”** → then look for **“D1”** or **“Databases”** in the same area.)

3. **Create a new database**
   - Click the button that says **“Create database”** (or “Add database”).
   - **Name:** type something like **`sgf-dashboard-db`** (so you remember it’s for the dashboard).
   - You can leave the rest as it is. Click **“Create”** (or “Save”).

4. **Find the database ID**
   - After you create it, you’ll see your new database in the list.
   - Click **the name** of the database (e.g. `sgf-dashboard-db`).
   - You’ll see a page with details. Look for something called **“Database ID”** or **“ID”**. It’s a long line of letters and numbers, like:
     - `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - **Copy that whole thing** (click to select it, then Copy). Put it somewhere safe for a second (e.g. a Notepad or Notes). You’ll paste it in the next part.

You’re done with Part 1. You now have a D1 database and its **ID** copied.

---

## Part 2: Put the database ID into your project

Your project has a file called **wrangler.toml**. It tells Cloudflare how to run your app. We need to add the database ID there so Cloudflare knows which database to use.

1. **Open your project in Cursor** (or whatever you use to edit the code).

2. **Open the file `wrangler.toml`**
   - In the **left sidebar**, find the folder **team-dashboard**.
   - Click it to open it.
   - Click the file **wrangler.toml**. It opens in the middle of the screen.

3. **Find the commented-out database block**
   - Scroll down until you see a few lines that start with **#** and then:
     - `# [[d1_databases]]`
     - `# binding = "DB"`
     - etc.
   - That whole block is “commented out” (the **#** means “don’t use this yet”).

4. **Uncomment and add your ID**
   - **Uncomment** = remove the **#** at the start of each of those lines, so Cloudflare can read them.
   - And where it says **`your-real-uuid-here`**, **delete that** and **paste your real Database ID** (the long ID you copied in Part 1).

   So it should look like this (but with **your** ID, not this exact one):

   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "sgf-dashboard-db"
   database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   ```

   Use **your** database ID in place of `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

5. **Save the file**
   - Press **Ctrl+S** (Windows) or **Cmd+S** (Mac), or click **File → Save**.

6. **Push to GitHub**
   - So Cloudflare gets the new file:
     - In the terminal (or Cursor’s terminal), run:
     ```bash
     cd /Users/jimng/.openclaw/workspace/team-dashboard
     git add wrangler.toml
     git commit -m "Add D1 database ID"
     git push origin main
     ```
   - Cloudflare will build and deploy again. This time it will have a valid database ID and the deploy should still work (and later, when the app code uses the database, it will be connected).

---

## Short recap

| Step | What you did |
|------|------------------|
| 1 | Opened Cloudflare → Workers & Pages → D1. |
| 2 | Created a database, named it e.g. `sgf-dashboard-db`. |
| 3 | Opened that database and copied its **Database ID**. |
| 4 | Opened **wrangler.toml** in your project. |
| 5 | Uncommented the D1 block (removed the **#**) and pasted your real **database_id**. |
| 6 | Saved and pushed to GitHub so Cloudflare sees the change. |

After this, the database is created and “plugged in” in the config. When the app code is updated to use D1 (instead of SQLite), it will use this database. You don’t need to do this part again unless you create a new database.
