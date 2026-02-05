/**
 * Worker-safe HTML renderers (no eval/Function). Replaces EJS for Cloudflare Workers.
 */

function esc(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLogin(data) {
  const query = data.query || {};
  const showError = query.error === 'unauthorized';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Log in — SGF Team Dashboard</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="login-page">
  <main class="login-box">
    <h1>SGF Team Dashboard</h1>
    <p class="muted">Sign in with your team Google account to manage tickets and view system status.</p>
    ${showError ? '<p class="error">Your account is not allowed to access this dashboard.</p>' : ''}
    <a href="/auth/google" class="btn btn-google">Sign in with Google</a>
  </main>
</body>
</html>`;
}

export function renderDashboard(data) {
  const { user, status, tickets, openclawUrl = '', botEnabled = true } = data;
  const userName = esc(user?.name || user?.email || '');
  const statusClass = status?.live ? 'live' : 'down';
  const statusLabel = status?.live ? 'Live' : 'Down';
  const statusMessage = esc(status?.message || '');
  const sessionsCount = status?.sessionsCount;
  const userId = user?.id ?? '';
  const showOpenclaw = openclawUrl && status?.live;

  const rows = (tickets || []).map((t) => {
    const assignedLabel = t.assigned_to_type === 'bot' ? 'Bot' : (t.assigned_to_name || t.assigned_to_email || 'Unknown');
    const orderCell = `${esc(t.order_number || '—')} / ${esc(t.customer_phone || '—')}`;
    const updatedStr = t.updated_at ? new Date(t.updated_at).toLocaleString() : '—';
    const botSelected = t.assigned_to_type === 'bot' ? ' selected' : '';
    const meSelected = t.assigned_to_type === 'human' && t.assigned_to_user_id == userId ? ' selected' : '';
    return `<tr data-ticket-id="${t.id}">
              <td>${t.id}</td>
              <td>${esc(t.summary)}</td>
              <td>${orderCell}</td>
              <td><span class="badge badge-${esc(t.status)}">${esc(t.status)}</span></td>
              <td>
                <select class="assign-select" data-ticket-id="${t.id}">
                  <option value="bot"${botSelected}>Bot</option>
                  <option value="human:${userId}"${meSelected}>Me</option>
                </select>
              </td>
              <td>${esc(updatedStr)}</td>
            </tr>`;
  }).join('');

  const emptyRow = rows
    ? ''
    : '<tr><td colspan="6" class="muted">No tickets yet. Create one above.</td></tr>';

  const sessionsCard =
    sessionsCount != null
      ? `<div class="status-card">
            <span class="status-dot neutral"></span>
            <div>
              <strong>${sessionsCount} sessions</strong>
              <p class="muted">OpenClaw</p>
            </div>
          </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard — SGF Team</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <h1 class="logo">SGF Team Dashboard</h1>
      <div class="user-menu">
        <span class="user-name">${userName}</span>
        <a href="/logout" class="btn btn-ghost">Log out</a>
      </div>
    </div>
  </header>
  <main class="main">
    <section class="section status-section">
      <h2>System status</h2>
      <div class="status-cards">
        <div class="status-card ${statusClass}">
          <span class="status-dot"></span>
          <div>
            <strong>${statusLabel}</strong>
            <p class="muted">${statusMessage}</p>
          </div>
        </div>
        ${sessionsCard}
      </div>
      <p class="muted small">Status refreshes every 30s.</p>
    </section>

    <section class="section bot-control-section">
      <h2>Bot control</h2>
      <p class="muted">Kill switch: turn the customer-facing bot off when you need to. When off, the bot will not process messages (if your gateway checks this dashboard).</p>
      <div class="bot-toggle-wrap">
        <button type="button" id="bot-toggle-btn" class="btn ${botEnabled ? 'btn-primary' : 'btn-ghost'}" data-enabled="${botEnabled ? '1' : '0'}">
          ${botEnabled ? 'Bot is ON' : 'Bot is OFF'}
        </button>
        <span id="bot-toggle-status" class="muted small"></span>
      </div>
    </section>

    ${showOpenclaw ? `
    <section class="section openclaw-section">
      <h2>OpenClaw</h2>
      <p class="muted">Bot is ready. View sessions and send messages from the OpenClaw dashboard.</p>
      <a href="${esc(openclawUrl)}" target="_blank" rel="noopener" class="btn btn-primary">Open OpenClaw dashboard</a>
      <div id="openclaw-recent" class="openclaw-recent muted small" style="margin-top:1rem;"></div>
    </section>
    ` : ''}

    <section class="section">
      <h2>Tickets</h2>
      <p class="muted">Assign tickets to <strong>Bot</strong> or <strong>you</strong> so it's clear who is in charge.</p>

      <div class="ticket-form">
        <h3>New ticket</h3>
        <form action="/api/tickets" method="post" id="new-ticket-form" class="form-inline">
          <input type="text" name="summary" placeholder="Summary (e.g. Customer wants address change)" required>
          <input type="text" name="order_number" placeholder="Order (e.g. SGF1991)">
          <input type="text" name="customer_phone" placeholder="Customer phone">
          <button type="submit" class="btn btn-primary">Create ticket</button>
        </form>
      </div>

      <div class="table-wrap">
        <table class="ticket-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Summary</th>
              <th>Order / Customer</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            ${emptyRow}
          </tbody>
        </table>
      </div>
    </section>
  </main>
  <script src="/app.js"></script>
</body>
</html>`;
}
