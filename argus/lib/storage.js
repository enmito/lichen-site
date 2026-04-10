// storage.js — Wrapper around chrome.storage.local for Argus data

const KEYS = {
  MONITORS: 'argus_monitors',
  SETTINGS: 'argus_settings',
};

const DEFAULT_SETTINGS = {
  notifications: {
    browser: true,
    discord: false,
    webhookUrl: '',
  },
};

export const storage = {
  async getMonitors() {
    const result = await chrome.storage.local.get(KEYS.MONITORS);
    return result[KEYS.MONITORS] || [];
  },

  async saveMonitors(monitors) {
    await chrome.storage.local.set({ [KEYS.MONITORS]: monitors });
  },

  async addMonitor(entry) {
    const monitors = await this.getMonitors();
    monitors.push(entry);
    await this.saveMonitors(monitors);
  },

  async removeMonitor(id) {
    const monitors = await this.getMonitors();
    await this.saveMonitors(monitors.filter((m) => m.id !== id));
  },

  async updateLastValue(id, value) {
    const monitors = await this.getMonitors();
    const idx = monitors.findIndex((m) => m.id === id);
    if (idx !== -1) {
      monitors[idx].lastValue = value;
      monitors[idx].lastChecked = Date.now();
      await this.saveMonitors(monitors);
    }
  },

  async getSettings() {
    const result = await chrome.storage.local.get(KEYS.SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS, result[KEYS.SETTINGS]);
  },

  async saveSettings(settings) {
    await chrome.storage.local.set({ [KEYS.SETTINGS]: settings });
  },
};
