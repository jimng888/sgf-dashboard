(function () {
  function statusRefresh() {
    fetch('/api/status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var card = document.querySelector('.status-card.live, .status-card.down');
        if (!card) return;
        if (data.live) {
          card.classList.remove('down');
          card.classList.add('live');
          card.querySelector('strong').textContent = 'Live';
        } else {
          card.classList.remove('live');
          card.classList.add('down');
          card.querySelector('strong').textContent = 'Down';
        }
        var msg = card.querySelector('.muted');
        if (msg) msg.textContent = data.message;
      })
      .catch(function () {});
  }

  var newForm = document.getElementById('new-ticket-form');
  if (newForm) {
    newForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var body = {
        summary: form.summary.value,
        order_number: form.order_number.value || undefined,
        customer_phone: form.customer_phone.value || undefined
      };
      fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) {
          if (r.ok) window.location.reload();
          else return r.json().then(function (d) { alert(d.error || 'Failed'); });
        })
        .catch(function () { alert('Request failed'); });
    });
  }

  document.querySelectorAll('.assign-select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var ticketId = sel.getAttribute('data-ticket-id');
      var val = sel.value;
      var type = val === 'bot' ? 'bot' : 'human';
      var userId = type === 'human' ? val.split(':')[1] : null;
      fetch('/api/tickets/' + ticketId + '/assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_type: type, assigned_to_user_id: userId })
      })
        .then(function (r) {
          if (!r.ok) sel.value = sel.dataset.prev || sel.options[0].value;
        })
        .catch(function () { sel.value = sel.dataset.prev || sel.options[0].value; });
      sel.dataset.prev = sel.value;
    });
  });

  function openclawRecent() {
    var el = document.getElementById('openclaw-recent');
    if (!el) return;
    fetch('/api/openclaw/recent-messages?limit=8')
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (list) {
        if (!list.length) { el.innerHTML = 'No recent messages.'; return; }
        el.innerHTML = '<strong>Recent activity</strong>: ' + list.slice(0, 5).map(function (m) {
          var who = m.role === 'user' ? 'User' : 'Bot';
          var t = (m.text || '').slice(0, 60) + (m.text && m.text.length > 60 ? '…' : '');
          return who + ': ' + t;
        }).join(' · ');
      });
  }

  var botBtn = document.getElementById('bot-toggle-btn');
  if (botBtn) {
    botBtn.addEventListener('click', function () {
      var currentlyOn = botBtn.getAttribute('data-enabled') === '1';
      var nextOn = !currentlyOn;
      fetch('/api/settings/bot_enabled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextOn })
      })
        .then(function (r) {
          if (r.ok) {
            botBtn.setAttribute('data-enabled', nextOn ? '1' : '0');
            botBtn.textContent = nextOn ? 'Bot is ON' : 'Bot is OFF';
            botBtn.classList.toggle('btn-primary', nextOn);
            botBtn.classList.toggle('btn-ghost', !nextOn);
            var statusEl = document.getElementById('bot-toggle-status');
            if (statusEl) statusEl.textContent = nextOn ? 'Bot will process messages.' : 'Bot is paused.';
          }
        })
        .catch(function () { alert('Failed to update'); });
    });
  }

  setInterval(statusRefresh, 30000);
  openclawRecent();
})();
