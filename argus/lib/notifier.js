// notifier.js — Handles browser notifications and Discord webhook delivery
//
// Bug fixes applied:
//   Bug 1: Browser notifications were shown even when the user had disabled them.
//          Fix: Check settings.notifications.browser before calling
//               chrome.notifications.create().
//   Bug 2: Discord webhook payloads were sent without the required
//          "Content-Type: application/json" header, causing Discord to reject
//          every request with a 400 error.
//          Fix: Add { 'Content-Type': 'application/json' } to the fetch headers.

import { storage } from './storage.js';

export const notifier = {
  /**
   * Notify the user about a detected change.
   * Respects the user's notification preferences for both browser
   * notifications and Discord webhooks.
   *
   * @param {object} entry  - Monitor entry (id, name, url, …)
   * @param {object} result - Check result ({ currentValue, previousValue })
   */
  async notify(entry, result) {
    const settings = await storage.getSettings();

    await Promise.all([
      this._sendBrowserNotification(entry, result, settings),
      this._sendDiscordWebhook(entry, result, settings),
    ]);
  },

  // ── private ──────────────────────────────────────────────────────────────

  /**
   * Send a Chrome desktop notification.
   *
   * FIX (Bug 1): Guard added — return early when browser notifications are
   * disabled.  Previously this check was absent, so notifications fired
   * regardless of the user's preference.
   */
  async _sendBrowserNotification(entry, result, settings) {
    if (!settings.notifications?.browser) {
      // User has disabled browser notifications — do nothing.
      return;
    }

    const message = result.currentValue
      ? `New value: ${result.currentValue}`
      : 'Content has changed.';

    chrome.notifications.create(`argus-${entry.id}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: `Argus: ${entry.name || entry.url}`,
      message,
    });
  },

  /**
   * Send a Discord embed via an Incoming Webhook URL.
   *
   * FIX (Bug 2): Added `Content-Type: application/json` to the request
   * headers.  Without this header Discord returns HTTP 400 and silently
   * discards the payload, so messages never appeared in the channel.
   */
  async _sendDiscordWebhook(entry, result, settings) {
    if (!settings.notifications?.discord) return;

    const webhookUrl = settings.notifications.webhookUrl?.trim();
    if (!webhookUrl) return;

    const payload = {
      embeds: [
        {
          title: `🔔 Change detected: ${entry.name || entry.url}`,
          description: [
            `**URL:** ${entry.url}`,
            `**Previous:** ${result.previousValue || '*(none)*'}`,
            `**Current:** ${result.currentValue || '*(empty)*'}`,
          ].join('\n'),
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        // FIX: Content-Type header was missing; Discord requires it to parse
        // the JSON body correctly.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `[Argus] Discord webhook failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      console.error('[Argus] Discord webhook error:', err);
    }
  },
};
