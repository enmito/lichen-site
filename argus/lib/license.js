// license.js — ExtensionPay license check for Argus Pro features

import { extpay } from './ExtPay.js';

export const license = {
  async isPro() {
    try {
      const user = await extpay.getUser();
      return user.paid === true;
    } catch {
      return false;
    }
  },

  async openPayPage() {
    extpay.openPaymentPage();
  },
};
