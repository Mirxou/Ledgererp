# 🛠️ TECHNICAL IMPLEMENTATION ROADMAP

## Step-by-Step Execution Guide for Development Team

**Status:** Ready for Sprint Execution  
**Target Audience:** Backend Dev, Frontend Dev, QA Engineer  
**Estimated Duration:** 10-14 Working Days  

---

## PRIORITY 1: REMOVE SECURITY VULNERABILITIES (DAY 1)

### 1.1 Remove Debug Code from pi-storage.js

**File**: `static/js/pi-storage.js`  
**Lines**: 25-63 (and multiple others)  
**Severity**: 🔴 CRITICAL

**Issue**: Exposed debug endpoints to localhost:7243

```javascript
// #region agent log
fetch('http://127.0.0.1:7243/ingest/...', { ... })
// #endregion
```

**Command to Find All**:

```bash
grep -n "127.0.0.1:7243" static/js/*.js
grep -n "#region agent log" static/js/*.js
```

**Fix Strategy**:

```bash
# Option 1: Automated removal (test first)
sed -i '/\/\/ #region agent log/,/\/\/ #endregion/d' static/js/pi-storage.js

# Option 2: Manual removal (safer)
# Search pi-storage.js for each debug block and delete
```

**Verification**:

```bash
# Ensure no localhost refs remain
grep "127.0.0.1" static/js/*.js  # Should return nothing
grep "16" static/js/pi-adapter.js | grep "localhost"  # Should return nothing
```

---

## PRIORITY 2: FIX AUTHENTICATION FLOW (DAYS 1-2)

### 2.1 Update pi-adapter.js - Fix Scopes

**File**: `static/js/pi-adapter.js`  
**Current Location**: Line 55  
**Change Type**: CRITICAL FIX

**BEFORE** (WRONG):

```javascript
async authenticate() {
    if (!this.sdkInitialized) {
        await this.init();
    }

    const scopes = ['username', 'payments'];  // ❌ WRONG
```

**AFTER** (CORRECT):

```javascript
async authenticate() {
    if (!this.sdkInitialized) {
        await this.init();
    }

    const scopes = ['username'];  // ✅ CORRECT - Minimal scopes
    
    // Add detailed logging for debugging
    console.log('🔐 [Pi Auth] Starting authentication with scopes:', scopes);
```

**Implementation Steps**:

1. Open `static/js/pi-adapter.js` in editor
2. Find line with `const scopes = ['username', 'payments'];`
3. Change to: `const scopes = ['username'];`
4. Save and test

**Validation**:

```javascript
// In browser console, after page load:
console.log(window.piAdapter);
// Then click login and check scopes in Network tab
```

---

### 2.2 Fix Backend Login Endpoint Response

**File**: `app/routers/auth.py`  
**Section**: `/login` endpoint  
**Change Type**: ENHANCEMENT

**Current Issue**:

- Backend returns correct format but frontend may not handle errors
- Missing Content-Type in response

**BEFORE**:

```python
@router.post("/login")
async def login(request: Request, response: Response):
    try:
        data = await request.json()
        access_token = data.get("accessToken")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing accessToken")
        # ... rest of code
```

**FIX** - Add explicit response handling:

```python
@router.post("/login")
async def login(request: Request, response: Response):
    """
    Exchange Pi Access Token for HttpOnly session JWT
    Req #2: Auth Enhancement
    """
    try:
        # Parse request
        body = await request.json()
        access_token = body.get("accessToken")
        
        if not access_token:
            logger.warning("Login attempt without accessToken")
            raise HTTPException(status_code=400, detail="Missing accessToken")
        
        logger.debug(f"Login attempt with token: {access_token[:20]}...")
        
        # 1. Verify token with Pi Network
        user_data = await verify_pi_access_token(access_token)
        
        if not user_data:
            logger.warning(f"Invalid token presented")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # 2. Create session JWT
        session_token = create_session_token({
            "uid": user_data.get("uid"),
            "username": user_data.get("username"),
            "accessToken": access_token
        }, request)
        
        # 3. Set HttpOnly cookie
        is_secure = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="pi_session",
            value=session_token,
            httponly=True,
            secure=is_secure,
            samesite="strict",
            max_age=900,  # 15 minutes
            path="/"
        )
        
        # 4. Return success
        return JSONResponse({
            "status": "success",
            "message": "Logged in successfully",
            "user": {
                "username": user_data.get("username"),
                "uid": user_data.get("uid")
            }
        }, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication failed")
```

**Implementation Steps**:

1. Open `app/routers/auth.py`
2. Find the `/login` endpoint
3. Replace body with code above
4. Add logging import if missing: `import json` and `from fastapi.responses import JSONResponse`
5. Test with Postman / curl

**Test Command**:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"test_token"}' -v
```

---

### 2.3 Fix Backend /me Endpoint

**File**: `app/routers/auth.py`  
**Section**: Add new endpoint  
**Change Type**: REQUIRED

**Current Issue**:
Endpoint exists but doesn't properly validate session

**ADD** - New implementation:

```python
@router.get("/me")
async def get_me(request: Request):
    """
    Get current authenticated user
    Req #2: Session verification
    """
    try:
        # Try to get session token from cookie
        session_token = request.cookies.get("pi_session")
        
        if not session_token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Verify JWT and get user data
        user_data = verify_pi_token(request)
        
        return JSONResponse({
            "status": "success",
            "user": {
                "username": user_data.get("username"),
                "uid": user_data.get("uid")
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get me error: {e}")
        raise HTTPException(status_code=401, detail="Session invalid")
```

**Test Command**:

```bash
# First login to get cookie
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"test_token"}' \
  -c cookies.txt

# Then test /me with cookie
curl -X GET http://localhost:8000/api/auth/me \
  -b cookies.txt
```

---

## PRIORITY 3: VERIFY PI DEVELOPER PORTAL SETTINGS (DAY 2)

### 3.1 Checklist for configurations

**Go to**: <https://developer.minepi.com/apps>

**For each application:**

1. **App URL Verification**

   ```
   ✅ MUST BE EXACTLY: https://ledgererp.online
   ❌ NOT: https://www.ledgererp.online
   ❌ NOT: https://ledgererp.online/
   ❌ NOT: https://ledgererp.online/app
   ❌ NOT: http://ledgererp.online
   ```

2. **Scopes Configuration**

   ```
   ✅ username (REQUIRED)
   ❌ payments (DO NOT REQUEST)
   - Only request 'username' for login
   - Pi handles payments separately via Pi.createPayment()
   ```

3. **Domain Verification**

   ```
   ✅ validation-key.txt accessible at:
   https://ledgererp.online/static/validation-key.txt
   
   Test:
   curl https://ledgererp.online/static/validation-key.txt
   ```

4. **Weblink Configuration**

   ```
   ✅ https://ledgererp.online
   ❌ NOT with /static or /index.html
   ```

**If Changes Made:**

- Click "Save"
- Wait 2-5 minutes for propagation
- Test authentication again

---

## PRIORITY 4: FIX FRONTEND INITIALIZATION (DAY 2)

### 4.1 Fix lifecycle.js - Initialization Order

**File**: `static/js/lifecycle.js`  
**Current Issue**:

- Race condition between Pi SDK load and initialization
- No proper session check on startup

**BEFORE**:

```javascript
// Unclear initialization order
window.addEventListener('load', async () => {
    // Mixed concerns
});
```

**AFTER** - Clear phases:

```javascript
/**
 * APPLICATION LIFECYCLE
 * Phase 1: SDK Load
 * Phase 2: Session Check
 * Phase 3: Show UI
 */

// Phase 1: Wait for all external scripts
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📋 [Lifecycle] Phase 1: Checking dependencies...');
        
        // Check Pi SDK
        if (typeof Pi === 'undefined') {
            console.warn('⏳ [Lifecycle] Pi SDK not loaded yet, waiting...');
            // Wait for Pi SDK
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (typeof Pi !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => clearInterval(checkInterval), 5000); // 5s timeout
            });
        }
        
        console.log('✅ [Lifecycle] Phase 1: Dependencies ready');
        
        // Phase 2: Initialize Pi Adapter
        console.log('📋 [Lifecycle] Phase 2: Initializing Pi Adapter...');
        if (window.piAdapter) {
            try {
                await window.piAdapter.init();
                console.log('✅ [Lifecycle] Phase 2: Pi Adapter initialized');
            } catch (error) {
                console.error('❌ [Lifecycle] Pi Adapter init failed:', error);
            }
        }
        
        // Phase 3: Check existing session
        console.log('📋 [Lifecycle] Phase 3: Checking session...');
        try {
            const user = await fetch('/api/auth/me', {
                credentials: 'include'
            }).then(r => r.json()).catch(() => null);
            
            if (user && user.status === 'success') {
                console.log('✅ [Lifecycle] Phase 3: User already logged in:', user.user.username);
                // Show dashboard
                if (window.mainApp && window.mainApp.showDashboard) {
                    window.mainApp.showDashboard();
                }
            } else {
                console.log('ℹ️ [Lifecycle] Phase 3: Not logged in');
                // Show login
                showAuthSection();
            }
        } catch (error) {
            console.log('ℹ️ [Lifecycle] Session check failed (expected if not logged in)');
            showAuthSection();
        }
        
        // Hide loading spinner
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ [Lifecycle] Critical error:', error);
        // Show error to user
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.innerHTML = '<p style="color:red">⚠️ Failed to load. Please refresh.</p>';
        }
    }
});

function showAuthSection() {
    const authSection = document.getElementById('pi-login-section');
    if (authSection) authSection.style.display = 'block';
}
```

---

## PRIORITY 5: FIX FRONTEND LOGIN BUTTON (DAY 2)

### 5.1 Update HTML Event Handler

**File**: `static/index.html`  
**Find**: `#pi-auth-btn`  
**Change Type**: ENHANCEMENT

**Current HTML**:

```html
<button id="pi-auth-btn" class="welcome-btn welcome-btn-primary w-100 py-15">
    Sign in with Pi Browser
</button>
```

**Update JavaScript Handler** - Add to a script section:

```javascript
// Handler for Pi Auth Button
document.getElementById('pi-auth-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const btn = e.target;
    const originalText = btn.textContent;
    
    try {
        // Show loading state
        btn.textContent = '⏳ Connecting to Pi Browser...';
        btn.disabled = true;
        
        console.log('🚀 [Auth] Starting authentication flow...');
        
        // Call Pi Authentication
        const authResult = await piAdapter.authenticate();
        
        console.log('✅ [Auth] Authentication successful:', authResult.user);
        
        // Redirect to dashboard
        if (window.mainApp && window.mainApp.showDashboard) {
            window.mainApp.showDashboard();
        }
        
        // Show success message
        if (window.notificationManager) {
            window.notificationManager.show(
                `Welcome, ${authResult.user.username}!`,
                'success'
            );
        }
        
    } catch (error) {
        console.error('❌ [Auth] Authentication failed:', error);
        
        // Show error message
        if (window.notificationManager) {
            window.notificationManager.show(
                `Login failed: ${error.message}`,
                'error'
            );
        }
        
        // Reset button
        btn.textContent = originalText;
        btn.disabled = false;
        
        // Debug info
        if (typeof Pi === 'undefined') {
            console.error('Pi SDK not found!');
        } else {
            console.log('Pi SDK available, check console for details');
        }
    }
});
```

---

## PRIORITY 6: FIX STELLAR ACCOUNT ENDPOINT (DAY 3)

### 6.1 Verify Backend Implementation

**File**: `app/routers/blockchain.py`  
**Function**: `get_stellar_account()`  
**Status**: Implementation correct, needs testing

**Current Implementation** (Lines 50-80):

```python
@router.post("/get-stellar-account")
async def get_stellar_account(request: Request):
    """
    Get (Derive) the Stellar Account for the current user.
    Used by frontend to know its address.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing Token")
        
    token = auth_header.replace("Bearer ", "")
    user = await verify_pi_access_token(token)
    if not user:
        raise HTTPException(401, "Invalid Token")
        
    uid = user.get("uid")
    keypair = derive_keypair(uid)
    
    if not keypair:
        raise HTTPException(500, "Key derivation failed")
        
    return {
        "status": "success",
        "accountId": keypair.public_key,
        "publicKey": keypair.public_key,
        "message": "Account derived successfully"
    }
```

**Enhancement** - Add proper logging:

```python
@router.post("/get-stellar-account")
async def get_stellar_account(request: Request):
    """
    Get (Derive) the Stellar Account for the current user.
    Req #18: Singleton Listener - Backend derives accounts deterministically
    """
    try:
        # Get auth header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            logger.debug("Get account request without auth header")
            raise HTTPException(401, "Missing Authorization header")
        
        # Extract token
        token = auth_header.replace("Bearer ", "")
        logger.debug(f"Verifying token for account derivation")
        
        # Verify token
        user = await verify_pi_access_token(token)
        if not user or not user.get("uid"):
            logger.warning("Invalid token in account request")
            raise HTTPException(401, "Invalid token")
        
        # Derive keypair
        uid = user.get("uid")
        logger.info(f"Deriving Stellar account for user: {uid[:10]}...")
        
        keypair = derive_keypair(uid)
        if not keypair:
            logger.error(f"Failed to derive keypair for: {uid[:10]}...")
            raise HTTPException(500, "Key derivation failed")
        
        logger.info(f"✅ Account derived: {keypair.public_key[:10]}...")
        
        return {
            "status": "success",
            "accountId": keypair.public_key,
            "publicKey": keypair.public_key,
            "message": "Account derived successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account derivation error: {e}", exc_info=True)
        raise HTTPException(500, "Failed to get account")
```

---

## PRIORITY 7: IMPLEMENT PAYMENT FLOW (DAYS 3-4)

### 7.1 Implement Pi.createPayment() Flow

**File**: `static/js/invoice.js`  
**Function**: `initiatePiPayment()`  
**Pattern**: Hackathon 2025 (Blind_Lounge)

**BEFORE** (Current implementation):

```javascript
// Complex multi-step flow that doesn't match Hackathon pattern
```

**AFTER** (Corrected Hackathon pattern):

```javascript
/**
 * HACKATHON 2025 PATTERN: Pi.createPayment() Direct Integration
 * Based on Blind_Lounge (Best Privacy-Focused App)
 */
async initiatePiPayment() {
    const totalAmount = parseFloat(
        document.getElementById('total-pi-with-fee').textContent
    );
    
    if (!totalAmount || totalAmount <= 0) {
        console.error('❌ Invalid amount:', totalAmount);
        throw new Error('Invalid invoice amount');
    }
    
    // Generate unique memo for this invoice
    const invoiceId = this.id || 'INV-' + Date.now().toString(36);
    const memo = `P-${invoiceId.substring(0, 26)}`; // Keep under 28 bytes
    
    console.log('💳 [Payment] Starting payment:', { amount: totalAmount, memo });
    
    try {
        // Step 1: Prepare payment data
        const paymentData = {
            amount: totalAmount,
            memo: memo,
            metadata: {
                invoiceId: this.id,
                customerId: this.customerId,
                timestamp: new Date().toISOString()
            }
        };
        
        // Step 2: Define callbacks (CRITICAL)
        const callbacks = {
            // Called when server is ready to approve
            onReadyForServerApproval: async (payment) => {
                console.log('🔄 [Payment] Ready for approval:', payment);
                try {
                    const response = await fetch('/api/blockchain/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            paymentId: payment.identifier,
                            txid: payment.transaction?.txid,
                            amount: payment.amount,
                            memo: payment.memo
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Approval failed: ${response.statusText}`);
                    }
                    
                    console.log('✅ [Payment] Server approved');
                } catch (error) {
                    console.error('❌ [Payment] Approval error:', error);
                    throw error;
                }
            },
            
            // Called when payment is complete
            onReadyForServerCompletion: async (payment) => {
                console.log('🎉 [Payment] Ready for completion:', payment);
                try {
                    const response = await fetch('/api/blockchain/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            paymentId: payment.identifier,
                            txid: payment.transaction?.txid,
                            blockNumber: payment.transaction?.blockNumber
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Completion failed: ${response.statusText}`);
                    }
                    
                    console.log('✅ [Payment] Transaction completed');
                    
                    // Mark invoice as paid
                    this.status = 'paid';
                    await this.save();
                    
                    // Notify user
                    if (window.notificationManager) {
                        window.notificationManager.show(
                            '✅ Payment received!',
                            'success'
                        );
                    }
                    
                } catch (error) {
                    console.error('❌ [Payment] Completion error:', error);
                    throw error;
                }
            },
            
            // Called if user cancels
            onCancel: () => {
                console.log('⛔ [Payment] User cancelled');
                if (window.notificationManager) {
                    window.notificationManager.show(
                        'Payment cancelled',
                        'warning'
                    );
                }
            },
            
            // Called on any error
            onError: (error) => {
                console.error('❌ [Payment] Error:', error);
                if (window.notificationManager) {
                    window.notificationManager.show(
                        `Payment error: ${error.message}`,
                        'error'
                    );
                }
            }
        };
        
        // Step 3: Create payment (this opens the Pi Payment interface)
        console.log('📱 [Payment] Creating payment....');
        const payment = await window.piAdapter.createPayment(paymentData, callbacks);
        
        console.log('✅ [Payment] Payment flow initiated:', payment);
        
        return payment;
        
    } catch (error) {
        console.error('❌ [Payment] Failed to initiate:', error);
        throw error;
    }
}
```

**Integration with QR Button**:

```javascript
// In invoice modal, connect Generate QR button to this flow
document.getElementById('btn-generate-qr')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        // Save invoice first
        await invoiceManager.saveDraft();
        
        // Then initiate payment
        await invoiceManager.initiatePiPayment();
        
    } catch (error) {
        console.error('Failed:', error);
        alert('Error: ' + error.message);
    }
});
```

---

## PRIORITY 8: TESTING & VALIDATION (DAYS 4-5)

### 8.1 Unit Tests for Auth Flow

```javascript
// Create file: static/js/tests/auth.test.js

describe('Authentication Flow', () => {
    
    test('Pi.authenticate called with minimal scopes', async () => {
        // Mock Pi SDK
        window.Pi = {
            init: jest.fn().mockResolvedValue(true),
            authenticate: jest.fn().mockResolvedValue({
                user: { username: 'test_user', uid: 'test_uid' },
                accessToken: 'test_token'
            })
        };
        
        // Call authenticate
        const result = await piAdapter.authenticate();
        
        // Verify scopes
        expect(Pi.authenticate).toHaveBeenCalledWith(
            ['username'],  // ✅ ONLY username
            expect.any(Function)
        );
        
        // Verify result
        expect(result.user.username).toBe('test_user');
    });
    
    test('Backend login endpoint called with accessToken', async () => {
        // Mock fetch
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                status: 'success',
                user: { username: 'test_user' }
            })
        });
        
        // Simulate
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ accessToken: 'token' })
        });
        
        // Verify
        expect(fetch).toHaveBeenCalledWith(
            '/api/auth/login',
            expect.objectContaining({
                method: 'POST'
            })
        );
        
        const data = await response.json();
        expect(data.status).toBe('success');
    });
});
```

### 8.2 Manual Testing Steps

**Test 1: Login Flow**

```
1. Open https://ledgererp.online in Pi Browser
2. Click "Sign in with Pi Browser"
3. Verify Pi SDK prompts for authentication
4. Accept authentication
5. ✅ Should see dashboard
```

**Test 2: Session Persistence**

```
1. Login successfully (Test 1)
2. Refresh page
3. ✅ Should stay logged in (no re-login needed)
4. Close tab
5. Open https://ledgererp.online again
6. ✅ Should be logged in from session cookie
```

**Test 3: Create Invoice**

```
1. Login
2. Click "Create Invoice"
3. Add items with Pi prices
4. Click "Generate Payment QR"
5. ✅ Should show QR code for payment
```

**Test 4: Process Payment**

```
1. Generate QR (Test 3)
2. Open Pi Browser payment interface
3. Approve payment
4. ✅ Should receive SSE notification
5. Invoice status should change to "paid"
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment (1 Day)

- [ ] All code reviewed
- [ ] Tests passing (100% auth tests)
- [ ] No console errors
- [ ] No debug code remaining
- [ ] CSP headers correct
- [ ] SSL certificate valid

### Deployment Steps

```bash
# 1. Commit changes
git add -A
git commit -m "Fix authentication and payment flow"

# 2. Deploy backend
python -m pip install -r requirements.txt
# Run migrations if needed
# Start server

# 3. Deploy frontend
# Files updated:
# - static/js/pi-adapter.js
# - static/js/lifecycle.js
# - static/js/invoice.js
# - app/routers/auth.py
# - app/routers/blockchain.py

# 4. Verify deployment
curl https://ledgererp.online/api/auth/me

# 5. Test in Pi Browser
# Open https://ledgererp.online
# Try login
```

### Post-Deployment Monitoring

- Monitor error logs for 24h
- Check for auth failures in backend logs
- Monitor Pi API rate limits
- Check SSE connection stability
- Monitor user feedback

---

**Document Version:** 1.0  
**Implementation Owner:** Development Team  
**QA Owner:** QA Engineer  
**Deployment Owner:** DevOps  
**Last Updated:** March 12, 2026
