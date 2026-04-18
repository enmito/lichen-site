// ExtPay.js — Thin wrapper around the ExtensionPay SDK
// See https://extensionpay.com for documentation.

export function ExtPay(extensionId) {
  const BASE = 'https://extensionpay.com';

  return {
    async getUser() {
      const response = await fetch(`${BASE}/api/v1/extension/${extensionId}/user`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`ExtPay: ${response.status}`);
      return response.json();
    },

    openPaymentPage() {
      chrome.tabs.create({ url: `${BASE}/extension/${extensionId}/paid` });
    },
  };
}

export const extpay = ExtPay(chrome.runtime.id);
