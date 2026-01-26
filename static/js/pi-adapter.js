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

            // 3. Pi App Studio Communication (Official Protocol)
            // This allows the app to run smoothly inside the Developer Portal iframe
            try {
                window.parent.postMessage(JSON.stringify({
                    type: '@pi:app:sdk:communication_information_request',
                    id: 'pi-ledger-' + Date.now()
                }), '*');
                console.log('📨 Sent handshake to Pi App Studio');

                // Req #6: Listener for App Studio
                window.addEventListener('message', (event) => {
                    if (event.data && event.data.type === '@pi:app:sdk:communication_information_request') {
                        console.log('📨 Received handshake response from App Studio');
                        // Can extract accessToken or appId if needed: const { accessToken, appId } = event.data.payload;
                    }
                });
            } catch (e) {
                // Ignore if not in iframe or parent not accessible (security restriction)
                console.debug('Optional App Studio handshake skipped');
            }

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

        const scopes = ['username', 'payments']; // Standard pattern: Request both main scopes

        // Define onIncompletePaymentFound (Required for all apps)
        // CRITICAL REQ #3: Mandatory Resilience Callback
        const onIncompletePaymentFound = async (payment) => {
            console.log('🔄 [Pi SDK] Incomplete payment found:', payment);

            try {
                // Return promise to Pi SDK (it waits for this)
                // We MUST hit our backend to finalize the transaction if it exists
                if (payment.transaction && payment.transaction.txid) {
                    // Check backend /blockchain/complete
                    const response = await fetch('/blockchain/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_id: payment.identifier,
                            txid: payment.transaction.txid
                        })
                    });

                    if (response.ok) {
                        console.log('✅ Incomplete payment recovered and completed');
                    } else {
                        console.error('❌ Failed to recover incomplete payment on backend');
                    }
                } else {
                    // Payment created but no TXID yet - usually cancelled or failed before blockchain
                    console.warn('⚠️ Payment incomplete and no TXID. User might need to cancel or retry.');
                    // Optionally call /blockchain/approve if we want to check approval status, 
                    // but usually 'incomplete' implies we need to finish it.
                }

                // NOTE: User's Master Guide snippet had `return await Pi.completePayment(payment.identifier)`.
                // However, the standard V2 flow is Backend calls /complete. 
                // The onIncompletePaymentFound callback's job is to ensure that happens.
                // We return nothing (void) or a promise that resolves when handled.
                return;

            } catch (err) {
                console.error('❌ Error handling incomplete payment:', err);
            }
        };

        try {
            // Official Authentication Call
            const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);

            if (!authResult || !authResult.user) {
                console.error('❌ Authentication returned empty result:', authResult);
                throw new Error('Authentication failed. Please try again in Pi Browser.');
            }

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
     * Create Payment (Standard flow)
     * Matches invoice.js expectation (aliased as createPiPayment if needed)
     */
    async createPayment(paymentData, callbacks) {
        if (!this.sdkInitialized) await this.init();
        return Pi.createPayment(paymentData, callbacks);
    }

    // Alias for invoice.js compatibility
    async createPiPayment(amount, memo, walletAddress, onReadyForServerApproval, onReadyForServerCompletion, onCancel, onError) {
        // Construct the standard payment object expected by Pi SDK
        const paymentData = {
            amount: parseFloat(amount),
            memo: memo,
            metadata: {
                type: 'invoice',
                // Add any other metadata needed
            }
            // Note: recipient is usually set by the app configuration not per-payment in V2 SDK unless using PaymentDTO,
            // BUT standard Pi.createPayment takes { amount, memo, metadata }. 
            // The Developer Portal configures the "Receiving Wallet".
            // If the SDK allows overriding recipient, we add it. 
            // Checking Docs: V2 usually uses the app's wallet.
            // But if we want to support P2P we might need specialized flow.
            // For compliance, we stick to standard signatures.
        };

        // Wrap callbacks to ensure they match SDK expectations
        const callbacks = {
            onReadyForServerApproval: onReadyForServerApproval,
            onReadyForServerCompletion: onReadyForServerCompletion,
            onCancel: onCancel,
            onError: onError
        };

        return this.createPayment(paymentData, callbacks);
    }
}

// Expose simplified instance
const piAdapter = new PiAdapter();
// Ensure it's available globally as expected by index.html logic
window.piAdapter = piAdapter;
