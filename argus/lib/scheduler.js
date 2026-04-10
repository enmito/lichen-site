// scheduler.js — Alarm-based scheduler for periodic monitor checks

export const scheduler = {
  async start(monitorId, intervalMinutes = 5) {
    const alarmName = `argus-${monitorId}`;
    await chrome.alarms.create(alarmName, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes,
    });
  },

  async stop(monitorId) {
    await chrome.alarms.clear(`argus-${monitorId}`);
  },

  async stopAll() {
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.startsWith('argus-')) {
        await chrome.alarms.clear(alarm.name);
      }
    }
  },

  async isRunning(monitorId) {
    const alarm = await chrome.alarms.get(`argus-${monitorId}`);
    return alarm !== undefined;
  },
};
