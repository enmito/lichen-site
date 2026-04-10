# Argus — Web Page Change Monitor

Argus is a browser extension that watches web page elements for changes and notifies you via browser notifications and/or a Discord webhook.

---

## Features

- Monitor any CSS selector on any web page for text changes.
- Configurable check interval (1 minute to 24 hours).
- Desktop (browser) notifications.
- Discord Incoming Webhook notifications with rich embeds.
- Element picker — click any element on a page to generate its selector automatically.

---

## Bug Fixes (this release)

### Bug 1 — Browser notifications fired even when disabled

**Symptom:** Users received browser notifications even after turning them off in Settings.

**Root cause:** `notifier.js` called `chrome.notifications.create()` unconditionally, without first checking the user's `notifications.browser` setting.

**Fix applied in `lib/notifier.js` (`_sendBrowserNotification`)**:

```js
// BEFORE (buggy)
async _sendBrowserNotification(entry, result, settings) {
  chrome.notifications.create(`argus-${entry.id}`, { ... });
}

// AFTER (fixed)
async _sendBrowserNotification(entry, result, settings) {
  if (!settings.notifications?.browser) return;  // ← guard added
  chrome.notifications.create(`argus-${entry.id}`, { ... });
}
```

---

### Bug 2 — Discord Webhook messages never arrived

**Symptom:** Discord webhook was configured and enabled, but no messages appeared in the Discord channel. The network request returned HTTP 400.

**Root cause:** The `fetch()` call in `notifier.js` was missing the `Content-Type: application/json` header. Discord's API requires this header to parse the JSON body; without it, the server returns `400 Bad Request` and discards the payload.

**Fix applied in `lib/notifier.js` (`_sendDiscordWebhook`)**:

```js
// BEFORE (buggy)
const response = await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify(payload),   // ← no Content-Type header
});

// AFTER (fixed)
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // ← header added
  body: JSON.stringify(payload),
});
```

---

## File Structure

```
argus/
├── manifest.json                 Extension manifest (MV3)
├── background.js                 Service worker — alarm handler, message router
├── SPEC.md                       This file
├── content-scripts/
│   └── selector.js               Element-picker content script
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   ├── ExtPay.js                 ExtensionPay integration
│   ├── license.js                Pro-plan license check
│   ├── monitor.js                Fetches page and extracts selector value
│   ├── notifier.js               Browser notifications + Discord webhook
│   ├── scheduler.js              chrome.alarms wrapper
│   └── storage.js                chrome.storage.local wrapper
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── store/                        Chrome Web Store assets
```

---

## Settings

| Setting | Description |
|---|---|
| Browser notifications | Show a desktop notification when a change is detected. |
| Discord Webhook | Post a rich embed to a Discord channel via an Incoming Webhook URL. |
| Webhook URL | The full `https://discord.com/api/webhooks/…` URL. |

---

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Persist monitor entries and settings. |
| `alarms` | Schedule periodic page checks. |
| `notifications` | Show desktop notifications. |
| `scripting` | Inject the element-picker into pages. |
| `tabs` | Open the payment page and query the active tab. |
| `<all_urls>` (host) | Fetch monitored URLs from the background service worker. |
