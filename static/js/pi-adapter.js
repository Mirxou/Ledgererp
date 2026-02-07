/**
 * Compatibility Pi Adapter shim.
 * Keeps legacy imports working while main app uses inline adapter in index.html.
 */
(function () {
  if (window.PiAdapter && window.piAdapter) return;

  class PiAdapter {
    constructor() {
      this.user = null;
    }

    async initialize() {
      if (typeof Pi === 'undefined') {
        throw new Error('Pi SDK unavailable. Open in Pi Browser or include pi-sdk.js');
      }
      const isSandbox = window.location.search.includes('sandbox=true') ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      try {
        Pi.init({ version: '2.0', sandbox: isSandbox });
      } catch (e) {
        if (!String(e.message || '').includes('already initialized')) throw e;
      }
    }

    async authenticate() {
      await this.initialize();
      const auth = await Pi.authenticate(['username', 'payments']);
      this.user = auth.user;
      return { user: auth.user, authResult: auth };
    }
  }

  window.PiAdapter = PiAdapter;
  window.piAdapter = window.piAdapter || new PiAdapter();
})();
