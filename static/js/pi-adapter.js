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
            const isSandbox = window.location.search.includes('sandbox=true');

            await Pi.init({ version: '2.0', sandbox: isSandbox });
            this.sdkInitialized = true;
            console.log(`✅ Pi SDK Initialized (Sandbox: ${isSandbox})`);

            // 3. Pi App Studio Communication (Official Protocol)
            try {
                window.parent.postMessage(JSON.stringify({
                    type: '@pi:app:sdk:communication_information_request',
                    id: 'pi-ledger-' + Date.now()
                }), '*');
            } catch (e) {
                console.debug('Optional App Studio handshake skipped');
            }

        } catch (error) {
            console.error('❌ Pi SDK Init Failed:', error);
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

        const scopes = ['username', 'payments'];

        const onIncompletePaymentFound = async (payment) => {
            console.log('🔄 [Pi SDK] Incomplete payment found:', payment);
            try {
                if (payment.transaction && payment.transaction.txid) {
                    await fetch('/api/blockchain/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_id: payment.identifier,
                            txid: payment.transaction.txid
                        })
                    });
                }
                return;
            } catch (err) {
                console.error('❌ Error handling incomplete payment:', err);
            }
        };

        try {
            const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
            if (!authResult || !authResult.user) {
                throw new Error('Authentication failed. Please try again in Pi Browser.');
            }

            this.currentUser = authResult.user;
            console.log('✅ Authentication Successful:', authResult);

            return {
                user: authResult.user,
                accessToken: authResult.accessToken,
                authResult: authResult
            };

        } catch (error) {
            console.error('❌ Authentication Failed:', error);
            throw error;
        }
    }

    async createPayment(paymentData, callbacks) {
        if (!this.sdkInitialized) await this.init();
        return Pi.createPayment(paymentData, callbacks);
    }

    async createPiPayment(amount, memo, callbacks) {
        const paymentData = {
            amount: parseFloat(amount),
            memo: memo,
            metadata: { type: 'invoice' }
        };
        return this.createPayment(paymentData, callbacks);
    }
}

const piAdapter = new PiAdapter();
window.piAdapter = piAdapter;
