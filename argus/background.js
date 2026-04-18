import { scheduler } from './lib/scheduler.js';
import { monitor } from './lib/monitor.js';
import { notifier } from './lib/notifier.js';
import { storage } from './lib/storage.js';

// Handle alarm events triggered by the scheduler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('argus-')) return;

  const monitorId = alarm.name.replace('argus-', '');
  const monitors = await storage.getMonitors();
  const entry = monitors.find((m) => m.id === monitorId);
  if (!entry || !entry.enabled) return;

  try {
    const result = await monitor.check(entry);
    if (result.changed) {
      await notifier.notify(entry, result);
      await storage.updateLastValue(monitorId, result.currentValue);
    }
  } catch (err) {
    console.error(`[Argus] Monitor check failed for ${monitorId}:`, err);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_MONITOR') {
    scheduler.start(message.monitorId, message.intervalMinutes);
    sendResponse({ ok: true });
  } else if (message.type === 'STOP_MONITOR') {
    scheduler.stop(message.monitorId);
    sendResponse({ ok: true });
  } else if (message.type === 'RUN_NOW') {
    (async () => {
      const monitors = await storage.getMonitors();
      const entry = monitors.find((m) => m.id === message.monitorId);
      if (!entry) { sendResponse({ ok: false, error: 'Monitor not found' }); return; }
      try {
        const result = await monitor.check(entry);
        if (result.changed) {
          await notifier.notify(entry, result);
          await storage.updateLastValue(entry.id, result.currentValue);
        }
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true; // keep message channel open for async response
  }
});
