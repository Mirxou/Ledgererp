/**
 * Pi Network Adapter
 * Req #1: Use Pi.authenticate() ONLY (no custom login)
 * Req #2: Implement onIncompletePaymentFound (CRITICAL SDK Requirement)
 * Req #16: Enforce Stellar Memo limit <= 28 bytes
 * Req #17: Calculate and show network fees (+0.01 Pi)
 * Req #18: No client polling (backend handles verification)
 * Req #19: Split Pay logic (Partial Pi + Partial Cash)
 * Req #20: Volatility protection (120s QR TTL + real-time rate)
 */
class PiAdapter {
    constructor() {
        this.user = null;
        this.accessToken = null;
        this.paymentCallbacks = new Map();
        this.incompletePayments = [];
        this.exchangeRate = null;
        this.rateLastUpdated = null;
        this.RATE_TTL = 120000; // 120 seconds (Req #20)
        this.sdkInitialized = false;
    }

    /**
     * Wait for Pi global object to be defined
     */
    async waitForSdk(timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (typeof Pi !== 'undefined') {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    /**
     * Initialize Pi SDK (must be called before authenticate)
     */
    async initialize() {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:40',message:'initialize() called',data:{sdkInitialized:this.sdkInitialized,hasPi:typeof Pi!=='undefined',userAgent:navigator.userAgent.includes('PiBrowser')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        try {
            // Check if Pi SDK is available
            if (typeof Pi === 'undefined') {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:45',message:'Pi SDK undefined in initialize()',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                console.warn('Pi SDK not loaded. Pi authentication will not be available.');
                return { success: false, error: 'Pi SDK not loaded' };
            }

            // Initialize Pi SDK
            if (!this.sdkInitialized) {
                console.log('🔄 [INIT] Initializing Pi SDK...');
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:52',message:'Calling Pi.init()',data:{version:'2.0',sandbox:false,hasPi:typeof Pi!=='undefined',hasInit:typeof Pi?.init==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                
                // CRITICAL: In Production (Pi Browser), Pi.init() should NOT use sandbox
                // Wait a bit to ensure SDK is fully loaded
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Production mode - no sandbox (required for real Pi Browser)
                try {
                    await Pi.init({ version: '2.0', sandbox: false });
                    console.log('✅ [INIT] Pi.init() completed successfully');
                } catch (initError) {
                    console.error('❌ [INIT] Pi.init() failed:', initError);
                    // Try without explicit sandbox parameter (some SDK versions handle it automatically)
                    try {
                        await Pi.init({ version: '2.0' });
                        console.log('✅ [INIT] Pi.init() succeeded with minimal params');
                    } catch (retryError) {
                        console.error('❌ [INIT] Pi.init() retry also failed:', retryError);
                        throw retryError;
                    }
                }
                
                this.sdkInitialized = true;
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:55',message:'Pi.init() completed',data:{sdkInitialized:this.sdkInitialized},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                console.log('✅ [INIT] Pi SDK initialized successfully (Production Mode)');
            }

            return { success: true };
        } catch (error) {
            console.error('Pi SDK initialization failed:', error);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:60',message:'Pi.init() error',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            return { success: false, error: error.message };
        }
    }

    /**
     * Req #1: Authenticate using Pi.authenticate() ONLY
     * CRITICAL: This is the only authentication method allowed by Pi App Studio
     */
    async authenticate() {
        console.log('🔐 [AUTH] authenticate() called', { sdkInitialized: this.sdkInitialized, hasPi: typeof Pi !== 'undefined', userAgent: navigator.userAgent });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:67',message:'authenticate() called',data:{sdkInitialized:this.sdkInitialized,hasPi:typeof Pi!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        try {
            // Check if Pi SDK is available
            if (typeof Pi === 'undefined') {
                console.error('❌ [AUTH] Pi SDK undefined!');
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:72',message:'Pi SDK undefined error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                throw new Error('Pi SDK not loaded. Make sure to include Pi SDK script from https://sdk.minepi.com/pi-sdk.js');
            }
            console.log('✅ [AUTH] Pi SDK is available', { hasAuthenticate: typeof Pi.authenticate === 'function' });

            // Initialize SDK if not already initialized
            if (!this.sdkInitialized) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:79',message:'Initializing SDK',data:{hasPi:typeof Pi!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                // Req: Retry logic if Pi is undefined
                if (typeof Pi === 'undefined') {
                    console.log('Pi SDK not ready, waiting...');
                    await this.waitForSdk();
                }

                // Final check
                if (typeof Pi === 'undefined') {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:87',message:'Pi SDK failed to load after wait',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                    throw new Error('Pi SDK failed to load. Please check your internet connection or reload.');
                }

                const initResult = await this.initialize();
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:92',message:'SDK initialize result',data:{success:initResult.success,error:initResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                if (!initResult.success) {
                    throw new Error('Failed to initialize Pi SDK: ' + initResult.error);
                }
            }

            // CRITICAL: Req #1 - Use Pi.authenticate() ONLY (no custom login)
            // CRITICAL: Req #2 - Pass onIncompletePaymentFound callback (mandatory for SDK resilience)
            
            // Check if running in Pi Browser
            const isPiBrowser = navigator.userAgent.includes('PiBrowser');
            console.log('🌐 [AUTH] Environment check:', { isPiBrowser, hostname: window.location.hostname, hasPi: typeof Pi !== 'undefined', hasAuthenticate: typeof Pi?.authenticate === 'function' });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:98',message:'Calling Pi.authenticate()',data:{scopes:['username','payments'],hasPi:typeof Pi!=='undefined',hasAuthenticate:typeof Pi?.authenticate==='function',isPiBrowser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            if (!isPiBrowser) {
                console.error('❌ [AUTH] Not in Pi Browser!');
                throw new Error('Pi authentication requires Pi Browser. Please open this app in Pi Browser.');
            }
            
            if (typeof Pi === 'undefined') {
                console.error('❌ [AUTH] Pi SDK not loaded!');
                throw new Error('Pi SDK is not loaded. Please refresh the page and try again.');
            }
            
            if (typeof Pi.authenticate !== 'function') {
                console.error('❌ [AUTH] Pi.authenticate is not a function!', { PiKeys: Object.keys(Pi || {}) });
                throw new Error('Pi.authenticate is not available. Please ensure Pi SDK is loaded correctly.');
            }
            
            // Add timeout to prevent infinite hanging (60 seconds for production)
            const scopes = ['username', 'payments'];
            console.log('🔄 [AUTH] Calling Pi.authenticate() with scopes:', scopes);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:140',message:'Creating auth promise with timeout',data:{scopes,timeout:60000},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            // CRITICAL: onIncompletePaymentFound MUST be a function (can be async or sync)
            // In Production, Pi SDK expects this callback to handle incomplete payments
            const incompletePaymentCallback = this.onIncompletePaymentFound.bind(this);
            console.log('🔗 [AUTH] onIncompletePaymentFound callback bound:', { type: typeof incompletePaymentCallback, isAsync: incompletePaymentCallback.constructor.name === 'AsyncFunction' });
            
            // CRITICAL: Ensure Pi SDK is ready before calling authenticate
            // Wait a small delay to ensure SDK is fully initialized
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('🚀 [AUTH] Starting Pi.authenticate() call...');
            const authPromise = Pi.authenticate(scopes, incompletePaymentCallback);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:145',message:'Authentication timeout triggered',data:{timeout:60000},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    reject(new Error('Authentication timeout: Pi.authenticate() took too long (60s). Please check your connection and try again.'));
                }, 60000)
            );
            
            console.log('⏳ [AUTH] Awaiting Pi.authenticate() with 60s timeout...');
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:152',message:'Awaiting Pi.authenticate() with race',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const authResult = await Promise.race([authPromise, timeoutPromise]);
            console.log('✅ [AUTH] Pi.authenticate() returned!', { hasResult: !!authResult, hasUser: !!(authResult?.user), uid: authResult?.user?.uid });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:155',message:'Pi.authenticate() promise resolved',data:{hasResult:!!authResult,hasUser:!!(authResult?.user)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion

            // Validate authentication response
            if (!authResult || !authResult.user) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:105',message:'Invalid auth response',data:{hasResult:!!authResult,hasUser:!!(authResult?.user)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                throw new Error('Invalid authentication response from Pi SDK');
            }

            // HACKATHON 2025 PATTERN: Store user data (Blind_Lounge pattern)
            this.user = {
                uid: authResult.user.uid, // Merchant ID = Pi.uid (Hackathon 2025 pattern)
                username: authResult.user.username
            };
            this.accessToken = authResult.accessToken;
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:113',message:'User data stored, checking KYC',data:{uid:this.user.uid,hasAccessToken:!!this.accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion

            // HACKATHON 2025 PATTERN: KYC check (required for all Hackathon winners)
            const kycStatus = await this.checkKYCStatus();
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:116',message:'KYC status received',data:{completed:kycStatus?.completed,status:kycStatus?.status,message:kycStatus?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            if (!kycStatus || !kycStatus.completed) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:117',message:'KYC not completed error',data:{hasKycStatus:!!kycStatus,completed:kycStatus?.completed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                throw new Error('KYC verification required. Please complete KYC in Pi Browser to use this application.');
            }
            
            // HACKATHON 2025 PATTERN: Store KYC status in user object (Blind_Lounge pattern)
            this.user.kycCompleted = kycStatus.completed;

            console.log('Pi authentication successful:', this.user);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:125',message:'Authentication successful',data:{uid:this.user.uid,kycCompleted:this.user.kycCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            return {
                success: true,
                user: this.user,
                accessToken: this.accessToken,
                kycCompleted: kycStatus.completed
            };
        } catch (error) {
            console.error('❌ [AUTH] Pi authentication failed:', error);
            console.error('❌ [AUTH] Error details:', { message: error.message, stack: error.stack, name: error.name });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:133',message:'Authentication error caught',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            // Return detailed error for debugging
            return {
                success: false,
                error: error.message || 'Authentication failed',
                details: error.toString(),
                stack: error.stack
            };
        }
    }

    /**
     * Req #2: CRITICAL - onIncompletePaymentFound callback
     * This is mandatory for SDK resilience and Pi App Studio compliance
     * Must handle all incomplete payment scenarios gracefully
     */
    async onIncompletePaymentFound(payment) {
        console.log('💰 [PAYMENT] onIncompletePaymentFound called:', payment);
        console.log('💰 [PAYMENT] Payment details:', { identifier: payment?.identifier, amount: payment?.amount, memo: payment?.memo });

        // Validate payment object
        if (!payment || !payment.identifier) {
            console.error('❌ [PAYMENT] Invalid incomplete payment object:', payment);
            // Return a promise that resolves (don't throw - SDK requirement)
            return Promise.resolve({
                success: false,
                error: 'Invalid payment object'
            });
        }

        // Store incomplete payment for tracking
        this.incompletePayments.push({
            identifier: payment.identifier,
            amount: payment.amount || 0,
            memo: payment.memo || '',
            timestamp: new Date().toISOString(),
            status: 'incomplete'
        });

        // Try to complete the payment
        try {
            const result = await this.completePayment(payment.identifier);

            // Notify callback if registered
            const callback = this.paymentCallbacks.get(payment.identifier);
            if (callback) {
                callback(result);
            }

            return result;
        } catch (error) {
            console.error('Failed to complete incomplete payment:', error);
            // Return error but don't throw (graceful degradation)
            const errorResult = {
                success: false,
                error: error.message || 'Failed to complete payment',
                payment_id: payment.identifier
            };

            // Notify callback of error
            const callback = this.paymentCallbacks.get(payment.identifier);
            if (callback) {
                callback(errorResult);
            }

            return errorResult;
        }
    }

    /**
     * Req #20: Fetch real-time Pi exchange rate
     */
    async fetchExchangeRate() {
        const now = Date.now();

        // Use cached rate if still valid
        if (this.exchangeRate && this.rateLastUpdated &&
            (now - this.rateLastUpdated) < this.RATE_TTL) {
            return this.exchangeRate;
        }

        try {
            // In production, fetch from actual exchange API
            // For now, use mock rate
            const response = await fetch('https://api.minepi.com/v1/exchange-rate', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }).catch(() => {
                // Fallback to mock rate
                return { json: () => Promise.resolve({ rate: 0.1 }) };
            });

            const data = await response.json();
            this.exchangeRate = data.rate || 0.1; // Default: $0.10 per Pi
            this.rateLastUpdated = now;

            return this.exchangeRate;
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
            // Return cached rate or default
            return this.exchangeRate || 0.1;
        }
    }

    /**
     * Req #16, #17, #20: Create payment request (QR Code Generation)
     * This method generates QR code data for display
     * Note: Actual payment is initiated via Pi.createPayment() SDK method
     */
    async createPayment(amountUSD, memo, merchantId) {
        try {
            // Req #20: Fetch real-time exchange rate
            const rate = await this.fetchExchangeRate();

            // Convert USD to Pi (with 2% buffer for volatility - Req #20)
            const amountPi = (amountUSD / rate) * 1.02;

            // Req #17: Add network fee (+0.01 Pi)
            const totalAmount = amountPi + 0.01;

            // Req #16: Format memo (P-{HexID}-{Code}, <= 28 bytes)
            const formattedMemo = this.formatMemo(memo, merchantId);

            // Validate memo length
            const memoBytes = new TextEncoder().encode(formattedMemo);
            if (memoBytes.length > 28) {
                throw new Error(`Memo exceeds 28 bytes limit: ${memoBytes.length} bytes`);
            }

            // Req #20: Generate QR code with 120s TTL
            const qrData = {
                amount: totalAmount,
                memo: formattedMemo,
                merchant_id: merchantId,
                expires_at: Date.now() + 120000, // 120 seconds
                rate: rate,
                rate_timestamp: this.rateLastUpdated
            };

            return {
                success: true,
                amount_pi: totalAmount,
                amount_base: amountPi,
                network_fee: 0.01,
                memo: formattedMemo,
                qr_data: qrData,
                exchange_rate: rate,
                expires_in: 120
            };
        } catch (error) {
            console.error('Error creating payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * CRITICAL: Create payment using Pi SDK (Pi.createPayment)
     * This is the actual payment method that uses Pi SDK
     * Required by Pi App Studio for proper payment processing
     */
    async createPiPayment(amountPi, memo, recipientAddress, onReadyForServerApproval, onReadyForServerCompletion, onCancel, onError) {
        try {
            // Check if Pi SDK is available
            if (typeof Pi === 'undefined' || !Pi.createPayment) {
                throw new Error('Pi SDK not available. Make sure Pi SDK is loaded.');
            }

            // Validate memo length (28 bytes max for Stellar)
            const memoBytes = new TextEncoder().encode(memo);
            if (memoBytes.length > 28) {
                throw new Error(`Memo exceeds 28 bytes limit: ${memoBytes.length} bytes`);
            }

            // Create payment using Pi SDK
            const paymentData = {
                amount: amountPi,
                memo: memo,
                metadata: {
                    recipient: recipientAddress,
                    timestamp: new Date().toISOString()
                }
            };

            // Call Pi.createPayment with proper callbacks
            const payment = await Pi.createPayment(
                paymentData,
                {
                    onReadyForServerApproval: onReadyForServerApproval || this.handleServerApproval.bind(this),
                    onReadyForServerCompletion: onReadyForServerCompletion || this.handleServerCompletion.bind(this),
                    onCancel: onCancel || this.handlePaymentCancel.bind(this),
                    onError: onError || this.handlePaymentError.bind(this)
                }
            );

            return {
                success: true,
                payment: payment,
                identifier: payment.identifier
            };
        } catch (error) {
            console.error('Error creating Pi payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle server approval callback
     */
    async handleServerApproval(paymentId, txid) {
        console.log('Payment ready for server approval:', { paymentId, txid });
        // Send to backend for approval
        try {
            const response = await fetch('/blockchain/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    txid: txid
                })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error approving payment:', error);
            throw error;
        }
    }

    /**
     * Handle server completion callback
     */
    async handleServerCompletion(paymentId, txid) {
        console.log('Payment ready for server completion:', { paymentId, txid });
        // Send to backend for completion
        try {
            const response = await fetch('/blockchain/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    txid: txid
                })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error completing payment:', error);
            throw error;
        }
    }

    /**
     * Handle payment cancellation
     */
    handlePaymentCancel(paymentId) {
        console.log('Payment cancelled:', paymentId);
        // Notify callback if registered
        const callback = this.paymentCallbacks.get(paymentId);
        if (callback) {
            callback({ success: false, cancelled: true });
        }
    }

    /**
     * Handle payment error
     */
    handlePaymentError(error, payment) {
        console.error('Payment error:', error, payment);
        // Notify callback if registered
        if (payment && payment.identifier) {
            const callback = this.paymentCallbacks.get(payment.identifier);
            if (callback) {
                callback({ success: false, error: error.message || 'Payment failed' });
            }
        }
    }

    /**
     * Req #30: Resolve .pi domain to wallet address
     */
    async resolvePiDomain(domain) {
        try {
            // Remove .pi suffix if present
            const cleanDomain = domain.replace(/\.pi$/, '');

            // In production, query Pi Network's domain resolution service
            // For now, return mock resolution
            const response = await fetch(`https://api.minepi.com/v1/domains/${cleanDomain}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }).catch(() => {
                // Fallback: return null if resolution fails
                return { json: () => Promise.resolve({ address: null }) };
            });

            const data = await response.json();
            return data.address || null;
        } catch (error) {
            console.error('Error resolving .pi domain:', error);
            return null;
        }
    }

    /**
     * Req #30: Check if input is a .pi domain and resolve it
     */
    async resolveInput(input) {
        // Check if input looks like a .pi domain
        if (input.includes('.pi') || input.match(/^[a-z0-9-]+$/i)) {
            const resolved = await this.resolvePiDomain(input);
            if (resolved) {
                return {
                    type: 'pi_domain',
                    original: input,
                    resolved: resolved
                };
            }
        }

        // Assume it's a wallet address
        return {
            type: 'wallet_address',
            resolved: input
        };
    }

    /**
     * Req #16: Format memo to fit Stellar limit (<= 28 bytes)
     * Format: P-{HexMerchantID}-{ShortCode}
     */
    formatMemo(memo, merchantId) {
        // Convert merchant ID to hex (truncate if needed)
        const hexId = this.stringToHex(merchantId).substring(0, 12);

        // Create short code from memo (max 8 chars)
        const shortCode = memo.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');

        // Format: P-{HexID}-{Code}
        const formatted = `P-${hexId}-${shortCode}`;

        // Ensure it fits in 28 bytes
        const encoder = new TextEncoder();
        const bytes = encoder.encode(formatted);

        if (bytes.length > 28) {
            // Truncate short code if needed
            const prefix = `P-${hexId}-`;
            const prefixBytes = encoder.encode(prefix).length;
            const maxCodeBytes = 28 - prefixBytes;

            const decoder = new TextDecoder('utf-8');
            let truncated = formatted;
            while (encoder.encode(truncated).length > 28) {
                const codePart = shortCode.substring(0, Math.max(0, shortCode.length - 1));
                truncated = `P-${hexId}-${codePart}`;
            }

            return truncated;
        }

        return formatted;
    }

    /**
     * Convert string to hex
     */
    stringToHex(str) {
        return Array.from(str)
            .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Req #19: Split payment (Partial Pi + Partial Cash)
     */
    async createSplitPayment(totalAmountUSD, piAmountUSD, cashAmountUSD, memo, merchantId) {
        try {
            // Create Pi payment portion
            const piPayment = await this.createPayment(piAmountUSD, memo, merchantId);

            if (!piPayment.success) {
                return piPayment;
            }

            // Cash portion is recorded offline (Req #5)
            return {
                success: true,
                pi_payment: piPayment,
                cash_amount: cashAmountUSD,
                total_amount: totalAmountUSD,
                split: {
                    pi_percentage: (piAmountUSD / totalAmountUSD) * 100,
                    cash_percentage: (cashAmountUSD / totalAmountUSD) * 100
                },
                cash_record: {
                    amount: cashAmountUSD,
                    currency: 'USD',
                    method: 'offline',
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error creating split payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Req #18: Request payment verification from backend
     * Client does NOT poll blockchain directly
     */
    async verifyPayment(transactionId, memo, amount) {
        try {
            const response = await fetch('/blockchain/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    transaction_id: transactionId,
                    memo: memo,
                    amount: amount,
                    merchant_id: this.user?.uid
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error verifying payment:', error);
            return {
                verified: false,
                error: error.message
            };
        }
    }

    /**
     * Complete payment (called by SDK or manually)
     */
    async completePayment(paymentId) {
        try {
            if (typeof Pi === 'undefined') {
                throw new Error('Pi SDK not available');
            }

            const result = await Pi.completePayment(paymentId);
            return {
                success: true,
                result: result
            };
        } catch (error) {
            console.error('Error completing payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Register payment callback
     */
    onPayment(callback) {
        this.paymentCallbacks.set('default', callback);
    }

    /**
     * HACKATHON 2025 PATTERN: Check KYC status (Blind_Lounge pattern)
     * Required for all Hackathon winners - KYC check before access
     */
    async checkKYCStatus() {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:615',message:'checkKYCStatus() called',data:{hasAccessToken:!!this.accessToken,tokenLength:this.accessToken?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        try {
            if (!this.accessToken) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:618',message:'No access token',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                return { completed: false, message: 'No access token available' };
            }

            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:623',message:'Fetching KYC status',data:{endpoint:'/api/pi/kyc-status',hasToken:!!this.accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            const response = await fetch('/api/pi/kyc-status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:632',message:'KYC status response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion

            if (!response.ok) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:635',message:'KYC status HTTP error',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:640',message:'KYC status data parsed',data:{kyc_completed:data.kyc_completed,completed:data.completed,status:data.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            // Backend returns {kyc_completed: true/false, kyc_status: "verified"/...}
            return {
                completed: data.kyc_completed || data.completed || false,
                status: data.kyc_status || data.status || 'unknown',
                message: data.message || 'KYC status checked'
            };
        } catch (error) {
            console.error('Error checking KYC status:', error);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/cfa6f69f-2861-47d3-9841-18153f70ab5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pi-adapter.js:645',message:'KYC status error caught',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            return { completed: false, message: 'Failed to check KYC status' };
        }
    }

    /**
     * Get user info
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.user !== null && this.accessToken !== null;
    }
}

// Export singleton instance
const piAdapter = new PiAdapter();
export default piAdapter;

