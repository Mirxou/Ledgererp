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

            console.log('✅ Pi SDK library found:', typeof Pi);

            // 2. Initialize with strict versioning
            const isSandbox = window.location.search.includes('sandbox=true');
            console.log('🔧 Initialize Pi SDK with sandbox mode:', isSandbox);
            console.log('📍 Current URL:', window.location.href);

            await Pi.init({ version: '2.0', sandbox: isSandbox });
            this.sdkInitialized = true;
            console.log(`✅ Pi SDK Initialized (Sandbox: ${isSandbox})`);

            // Phase 2: Secure Cookie Session Check
            await this.checkSession();

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
            console.error('📋 Error details:', {
                message: error.message,
                stack: error.stack,
                type: error.constructor.name
            });
            throw error;
        }
    }

    /**
     * Authenticate the user and sync with backend for HttpOnly session
     * @returns {Promise<Object>} The auth result { user, accessToken }
     */
    async authenticate() {
        if (!this.sdkInitialized) {
            await this.init();
        }

        // ✅ SECURITY FIX: Request minimal scopes only
        // Per Pi Developer Guide: request only required scopes
        // Payments are handled separately via Pi.createPayment()
        const scopes = ['username'];

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
            console.log('🔐 Starting Pi.authenticate() with scopes:', scopes);
            const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
            console.log('📊 Pi.authenticate() returned:', authResult);
            
            if (!authResult || !authResult.user) {
                throw new Error('Authentication failed. Please try again in Pi Browser.');
            }

            console.log('✅ Pi SDK authentication successful for user:', authResult.user.username);
            console.log('🔑 Access Token received:', authResult.accessToken ? 'YES (length: ' + authResult.accessToken.length + ')' : 'NO');

            // Phase 2: Secure Cookie Sync (Professor's Recommendation)
            console.log('🔄 Syncing session with secure backend...');
            console.log('📡 POST /api/auth/login with token...');
            
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    accessToken: authResult.accessToken
                })
            });

            console.log('📊 Backend response status:', loginResponse.status, loginResponse.statusText);
            
            if (!loginResponse.ok) {
                const errorBody = await loginResponse.text();
                console.error('❌ Backend response body:', errorBody);
                throw new Error(`Backend sync failed: ${loginResponse.statusText} - ${errorBody}`);
            }

            const syncResult = await loginResponse.json();
            console.log('✅ Backend Session Initialized (HttpOnly):', syncResult);

            this.currentUser = authResult.user;
            console.log('✅ Authentication Successful:', authResult);

            return {
                user: authResult.user,
                accessToken: authResult.accessToken,
                authResult: authResult,
                syncResult: syncResult
            };

        } catch (error) {
            console.error('❌ Authentication Failed:', error);
            console.error('📋 Full error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async createPayment(paymentData, callbacks) {
        if (!navigator.onLine) {
            const msg = 'عذراً، يجب أن تكون متصلاً بالإنترنت لإجراء عملية دفع.';
            if (window.notificationManager) window.notificationManager.show(msg, 'error');
            throw new Error('Offline: Payment cannot be initiated');
        }
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

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            console.log('✅ Logged out successfully');
        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    /**
     * Check if a secure session cookie exists and is valid
     */
    async checkSession() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                console.log('✅ Session verified from secure cookie for:', this.currentUser.username);
                return this.currentUser;
            }
        } catch (err) {
            console.warn('Session check failed:', err);
        }
        return null;
    }
}

const piAdapter = new PiAdapter();
window.piAdapter = piAdapter;
