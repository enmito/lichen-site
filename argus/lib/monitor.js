// monitor.js — Fetches a URL and extracts content using a CSS selector

export const monitor = {
  /**
   * Check a monitor entry for changes.
   * @param {object} entry - The monitor entry from storage.
   * @returns {{ changed: boolean, currentValue: string, previousValue: string }}
   */
  async check(entry) {
    const { url, selector, lastValue } = entry;

    let html;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      html = await response.text();
    } catch (err) {
      throw new Error(`Failed to fetch ${url}: ${err.message}`);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const element = doc.querySelector(selector);
    const currentValue = element ? element.textContent.trim() : '';

    return {
      changed: currentValue !== lastValue,
      currentValue,
      previousValue: lastValue || '',
    };
  },
};
