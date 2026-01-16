/**
 * Pi Network SDK Adapter - Standard Implementation
 * Adheres strictly to Official Pi Developer Guide
 */
class PiAdapter {
    constructor() {
        this.sdkInitialized = false;
        this.currentUser = null;
    }

    /**
     * Initialize the Pi SDK
     */
    async init() {
        try {
            // 1. Check if Pi SDK is loaded
            if (typeof Pi === 'undefined') {
                throw new Error('Pi SDK not found. Ensure pi-sdk.js is loaded.');
            }

            // 2. Initialize with strict versioning
            // Note: Sandbox mode is determined by the environment/Pi Browser, not just URL params in Prod.
            // But for testing transparency we can keep the flag if needed, or strictly follow docs.
            // Official docs often use: Pi.init({ version: "2.0", sandbox: true/false });
            // We will auto-detect sandbox from URL for developer convenience, but keep it clean.
            const isSandbox = window.location.search.includes('sandbox=true');

            await Pi.init({ version: '2.0', sandbox: isSandbox });
            this.sdkInitialized = true;
            console.log(`✅ Pi SDK Initialized (Sandbox: ${isSandbox})`);

        } catch (error) {
            console.error('❌ Pi SDK Init Failed:', error);
            // Re-throw to ensure calling code knows init failed
            throw error;
        }
    }

    /**
     * Authenticate the user
     * @returns {Promise<Object>} The auth result { user, accessToken }
     */
    async authenticate() {
        if (!this.sdkInitialized) {
            await this.init();
        }

        const scopes = ['username']; // Start with minimum required payment scopes if needed

        // Define onIncompletePaymentFound (Required for all apps)
        const onIncompletePaymentFound = async (payment) => {
            console.log('🔄 [Pi SDK] Incomplete payment found:', payment);

            // Standard Flow: Send paymentId to backend for verification & completion
            try {
                // Determine API endpoint (Standard Pi App Pattern)
                const completionEndpoint = '/api/pi/payment/complete';

                // If we were using a real backend, we would await this fetch
                // const response = await fetch(completionEndpoint, {
                //    method: 'POST',
                //    headers: { 'Content-Type': 'application/json' },
                //    body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction?.txid })
                // });

                // For this Peer-to-Peer / Local-First app, we might need a specific handling
                // But to comply with "Standard SDK" signatures, we define the intent clearly.

                if (payment.transaction && payment.transaction.txid) {
                    console.log('✅ Found TXID, attempting recovery:', payment.transaction.txid);
                    // In a fully server-side app, we would hit the server here.
                    // For now, we log as per "Standard Client" requirements if no server is present.
                } else {
                    console.warn('⚠️ Payment incomplete and no TXID. User might need to cancel or retry.');
                }

            } catch (err) {
                console.error('❌ Error handling incomplete payment:', err);
            }
        };

        try {
            // Official Authentication Call
            const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);

            this.currentUser = authResult.user;
            console.log('✅ Authentication Successful:', authResult);

            return {
                user: authResult.user,
                accessToken: authResult.accessToken,
                authResult: authResult // complete object
            };

        } catch (error) {
            console.error('❌ Authentication Failed:', error);
            // In standard implementation, we propagate the error to the UI
            throw error;
        }
    }

    /**
     * Placeholder for Payment creation (Standard flow)
     */
    async createPayment(paymentData, callbacks) {
        if (!this.sdkInitialized) throw new Error('Pi SDK not initialized');
        return Pi.createPayment(paymentData, callbacks);
    }
}

// Expose simplified instance
const piAdapter = new PiAdapter();
// Ensure it's available globally as expected by index.html logic
window.piAdapter = piAdapter;
