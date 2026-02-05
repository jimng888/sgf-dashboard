# Run the bot and alerts (WhatsApp replies + express / wrong-address notifications)

Use this when the bot doesn’t reply to WhatsApp or when express delivery / wrong-address alerts aren’t reaching the group. Run these steps **on the host where OpenClaw and your workspace live** (e.g. your Mac).

---

## 1. Bot must reply to WhatsApp (your number, customers)

The bot is the **OpenClaw gateway** + **WhatsApp Web**. Both must be running and linked.

1. **Start the OpenClaw gateway**
   - From the OpenClaw app: start the gateway (or leave it running).
   - Or in Terminal: `openclaw gateway run`. It should listen on port **18789**.

2. **Link WhatsApp (required after restart or if bot never replies)**
   ```bash
   openclaw channels login --channel whatsapp --account default
   ```
   On your phone: **WhatsApp → Settings → Linked devices → Link a device** and **scan the QR code**. You should see: `[whatsapp] Listening for personal WhatsApp inbound messages.`

3. **Confirm the kill switch is ON**
   - Open **https://sgf.bestmarketing.com.sg** and log in. In **Bot control**, set **Bot is ON**.
   - To force it on from the repo (e.g. if you can’t log in):
     ```bash
     cd team-dashboard/worker && npx wrangler d1 execute sgf-dashboard-db --remote --file=../schemas/d1-force-bot-on.sql
     ```

4. **Test** – Send a WhatsApp message to the bot from your number or @mention it in the group. It should reply.

If it still doesn’t reply, check **FIX-BOT-NOT-RESPONDING.md** and **DEBUG-BOT-NOT-RESPONDING.md** in your workspace (re-link WhatsApp, gateway logs).

---

## 2. Express delivery and wrong-address notifications in the group

Alerts are produced by **shopify-monitor-and-send.js** and sent by **wa-bridge-watcher.sh** via the gateway. Both run on the same host as the gateway.

1. **Start the watcher** (from your **workspace root**, where `scripts/` lives):
   ```bash
   bash ./scripts/wa-bridge-watcher.sh
   ```
   Leave it running. It needs the gateway to be up (port 18789).

2. **Run the monitor every minute (cron)** so new express/address alerts get queued and sent:
   ```bash
   crontab -e
   ```
   Add (adjust the path to your workspace):
   ```
   * * * * * PATH=/usr/local/bin:/opt/homebrew/bin:$PATH; cd /Users/jimng/.openclaw/workspace && node scripts/shopify-monitor-and-send.js >> /tmp/shopify-monitor-and-send.log 2>&1
   ```
   See **CRON-HOST-SETUP.md** in your workspace for more detail.

3. **Optional:** Set **SGF_X_WF_GROUP_JID** to the SGF x WF group JID so express and address alerts also go to that group.

---

## 3. Quick checklist

| Step | What to do |
|------|------------|
| Gateway running | Start OpenClaw gateway (app or `openclaw gateway run`). |
| WhatsApp linked | `openclaw channels login --channel whatsapp --account default` and scan QR. |
| Kill switch ON | Dashboard → Bot control → **Bot is ON**. Or run `d1-force-bot-on.sql`. |
| Watcher running | `bash ./scripts/wa-bridge-watcher.sh` (and leave it running). |
| Cron for alerts | Crontab runs `node scripts/shopify-monitor-and-send.js` every minute. |

After this, the bot should reply to WhatsApp and express / wrong-address alerts should appear in the group(s).
