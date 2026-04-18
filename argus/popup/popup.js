import { storage } from '../lib/storage.js';
import { scheduler } from '../lib/scheduler.js';

// ── View helpers ─────────────────────────────────────────────────────────────

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function showView(name) {
  ['view-monitors', 'view-form', 'view-settings'].forEach((v) =>
    v === `view-${name}` ? show(v) : hide(v)
  );
}

// ── Monitor list ─────────────────────────────────────────────────────────────

async function renderMonitors() {
  const list = document.getElementById('monitor-list');
  const monitors = await storage.getMonitors();

  if (monitors.length === 0) {
    list.innerHTML = '<p style="color:#888;font-size:12px;padding:8px 0">No monitors yet.</p>';
    return;
  }

  list.innerHTML = '';
  for (const m of monitors) {
    const running = await scheduler.isRunning(m.id);
    const item = document.createElement('div');
    item.className = 'monitor-item';
    item.innerHTML = `
      <span class="status-dot ${running ? 'active' : 'inactive'}"></span>
      <div class="monitor-info">
        <div class="monitor-name">${escHtml(m.name || m.url)}</div>
        <div class="monitor-url">${escHtml(m.url)}</div>
      </div>
      <div class="monitor-actions">
        <button class="btn-toggle" data-id="${m.id}" data-running="${running}">
          ${running ? 'Stop' : 'Start'}
        </button>
        <button class="btn-delete" data-id="${m.id}">✕</button>
      </div>
    `;
    list.appendChild(item);
  }

  list.querySelectorAll('.btn-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (btn.dataset.running === 'true') {
        await scheduler.stop(id);
      } else {
        const monitors = await storage.getMonitors();
        const m = monitors.find((x) => x.id === id);
        if (m) await scheduler.start(id, m.intervalMinutes);
      }
      renderMonitors();
    });
  });

  list.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await scheduler.stop(btn.dataset.id);
      await storage.removeMonitor(btn.dataset.id);
      renderMonitors();
    });
  });
}

// ── Add monitor form ──────────────────────────────────────────────────────────

document.getElementById('btn-add').addEventListener('click', () => {
  document.getElementById('form-title').textContent = 'New Monitor';
  document.getElementById('field-name').value = '';
  document.getElementById('field-url').value = '';
  document.getElementById('field-selector').value = '';
  document.getElementById('field-interval').value = '30';
  showView('form');
});

document.getElementById('btn-cancel').addEventListener('click', () => {
  showView('monitors');
});

document.getElementById('btn-pick').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKING' });
  window.close();
});

// Receive selected selector from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SELECTOR_PICKED') {
    document.getElementById('field-selector').value = message.selector;
    showView('form');
  }
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const name = document.getElementById('field-name').value.trim();
  const url = document.getElementById('field-url').value.trim();
  const selector = document.getElementById('field-selector').value.trim();
  const intervalMinutes = parseInt(document.getElementById('field-interval').value, 10) || 30;

  if (!url || !selector) {
    alert('URL and selector are required.');
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    name,
    url,
    selector,
    intervalMinutes,
    enabled: true,
    lastValue: '',
    lastChecked: null,
  };

  await storage.addMonitor(entry);
  await scheduler.start(entry.id, intervalMinutes);
  showView('monitors');
  renderMonitors();
});

// ── Settings panel ────────────────────────────────────────────────────────────

document.getElementById('btn-settings').addEventListener('click', async () => {
  const settings = await storage.getSettings();
  document.getElementById('setting-browser-notif').checked =
    settings.notifications?.browser ?? true;
  document.getElementById('setting-discord').checked =
    settings.notifications?.discord ?? false;
  document.getElementById('setting-webhook-url').value =
    settings.notifications?.webhookUrl ?? '';
  toggleWebhookUrlRow();
  showView('settings');
});

function toggleWebhookUrlRow() {
  const checked = document.getElementById('setting-discord').checked;
  document.getElementById('webhook-url-row').classList.toggle('hidden', !checked);
}

document.getElementById('setting-discord').addEventListener('change', toggleWebhookUrlRow);

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const settings = await storage.getSettings();
  settings.notifications = {
    browser: document.getElementById('setting-browser-notif').checked,
    discord: document.getElementById('setting-discord').checked,
    webhookUrl: document.getElementById('setting-webhook-url').value.trim(),
  };
  await storage.saveSettings(settings);
  showView('monitors');
});

document.getElementById('btn-cancel-settings').addEventListener('click', () => {
  showView('monitors');
});

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ──────────────────────────────────────────────────────────────────────

showView('monitors');
renderMonitors();
