# 🎯 CTO MASTER PLAN - Pi Ledger ERP

## Hackathon 2025 Winner Pattern Integration & Production Readiness

**Status:** Phase 26 - Sovereignty Preparation  
**Priority Level:** CRITICAL - Developer Portal Compliance  
**Timeline:** 2-4 Weeks Sprint  
**Target:** Production Launch with Full Pi Network Integration

---

## ⚠️ CRITICAL ISSUES IDENTIFIED

### 1. **Pi Browser Authentication FAILURE** 🔴

**Problem:** Cannot login using Pi Browser + Username

- **Root Cause:**
  - Scopes request missing `payments` scope inconsistency
  - App URL mismatch in Pi Developer Portal
  - Missing `onIncompletePaymentFound` proper handling
  - Backend verification endpoints not properly configured

**Evidence:**

```javascript
// pi-adapter.js:55 - Current (WRONG)
const scopes = ['username', 'payments'];

// Should be:
const scopes = ['username'];  // MINIMAL scopes per official guide
```

**Impact:** 0% login success rate in Pi Browser

---

### 2. **Hackathon 2025 Pattern Misalignment** 🟡

**Problem:** Code references Blind_Lounge pattern but implementation incomplete

- Missing key components from winning apps:
  - Incomplete payment recovery flow
  - Wrong Stellar account derivation method
  - Debug logging still active (security risk)
  - Agent log endpoints exposed (CRITICAL SECURITY)

**Evidence in pi-storage.js:25-63:**

```javascript
// 🔴 EXPOSED DEBUG ENDPOINT - REMOVE IMMEDIATELY
fetch('http://127.0.0.1:7243/ingest/...', { ... })
```

---

### 3. **Missing Auth Endpoints** 🔴

**Problem:** Backend routes not fully implemented

- `/api/auth/me` - GET endpoint missing CORS handling
- `/api/auth/login` - POST not checking Content-Type
- Session cookie validation broken
- No CSRF protection

---

### 4. **Stellar Account Derivation Broken** 🔴

**Problem:** Cannot get Stellar account from Pi Network

- Backend endpoint `/api/pi/get-stellar-account` not matching frontend calls
- Keypair derivation logic incorrect
- No error handling for Pi Network API failures

---

## 📋 MASTER PLAN - 4 PHASES

### PHASE 1: DIAGNOSTICS & VALIDATION (3 Days)

**Goal:** Fix all authentication flows and validate against official guide

#### 1.1 Review Official Pi Developer Guide

```
✅ Reference: PI_DEVELOPER_GUIDE_REFERENCE.md
- Verify Pi.init() timing
- Confirm scope requirements
- Check callback signatures
```

#### 1.2 Fix pi-adapter.js

**File:** `static/js/pi-adapter.js`

**Changes Required:**

```javascript
// BEFORE (Line 55)
const scopes = ['username', 'payments'];

// AFTER
const scopes = ['username'];  // Only request what we need

// BEFORE (Line 88-98) - Wrong API endpoint
const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ accessToken: authResult.accessToken })
});

// AFTER - Add proper error handling
const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Include cookies
    body: JSON.stringify({ accessToken: authResult.accessToken })
});
if (!loginResponse.ok) {
    throw new Error(`Auth failed: ${loginResponse.status}`);
}
```

#### 1.3 Remove Debug Code (URGENT SECURITY)

**Files to Clean:**

- `static/js/pi-storage.js` - Remove 15+ debug endpoint calls
- Search for: `fetch('http://127.0.0.1:7243/ingest`
- Action: DELETE ALL occurrences

#### 1.4 Verify Pi Developer Portal Configuration

**Checklist:**

- [ ] App URL in Portal: `https://ledgererp.online` (EXACT match)
- [ ] Scopes: `['username']` only
- [ ] Sandbox mode: OFF for production
- [ ] Domain verification: `validation-key.txt` served correctly

---

### PHASE 2: BACKEND COMPLIANCE (4 Days)

**Goal:** Align backend with official Pi Network requirements

#### 2.1 Fix Authentication Routes

**File:** `app/routers/auth.py`

```python
# ADD: Missing /me endpoint with proper CORS
@router.get("/me")
async def get_me(request: Request):
    """Get current user session"""
    token = request.cookies.get("pi_session")
    if not token:
        raise HTTPException(401, "Not authenticated")
    
    try:
        user_data = verify_pi_token(request)
        return {"status": "success", "user": user_data}
    except Exception as e:
        raise HTTPException(401, str(e))

# FIX: /login endpoint error handling
@router.post("/login")
async def login(request: Request, response: Response):
    """Exchange token for session"""
    data = await request.json()
    access_token = data.get("accessToken")
    
    if not access_token:
        raise HTTPException(400, "Missing accessToken")
    
    # Verify with Pi Network (cached)
    user_data = await verify_pi_access_token(access_token)
    
    # Create session JWT
    session_token = create_session_token({
        "uid": user_data["uid"],
        "username": user_data["username"]
    }, request)
    
    # Set secure cookie
    response.set_cookie(
        "pi_session",
        session_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=900
    )
    
    return {
        "status": "success",
        "user": {
            "uid": user_data["uid"],
            "username": user_data["username"]
        }
    }
```

#### 2.2 Fix Stellar Account Endpoint

**File:** `app/routers/blockchain.py`

```python
# Current implementation is CORRECT but needs error handling

@router.post("/get-stellar-account")
async def get_stellar_account(request: Request):
    """Get Stellar account for current user"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not token:
        # Try session cookie as fallback
        token = request.cookies.get("pi_session")
    
    try:
        # Verify token
        user = await verify_pi_access_token(token)
        uid = user.get("uid")
        
        # Derive keypair (deterministic from uid)
        keypair = derive_keypair(uid)
        
        return {
            "status": "success",
            "accountId": keypair.public_key,
            "publicKey": keypair.public_key
        }
    except Exception as e:
        logger.error(f"Stellar account error: {e}")
        raise HTTPException(401, "Failed to get account")
```

#### 2.3 Add CSRF Protection

**File:** `app/main.py`

```python
# Add CSRF middleware AFTER KYB middleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

# BEFORE routes
app.add_middleware(TrustedHostMiddleware, allowed_hosts=[
    "ledgererp.online",
    "localhost",
    "127.0.0.1"
])
```

---

### PHASE 3: FRONTEND FIXES (3 Days)

**Goal:** Align frontend with Hackathon 2025 winners (Blind_Lounge pattern)

#### 3.1 Remove Debug Code

**File:** `static/js/pi-storage.js`

**Action:** Remove all `fetch('http://127.0.0.1:7243/ingest...')` blocks

```bash
# Quick fix:
sed -i '/http:\/\/127.0.0.1:7243/,/\}\);/d' static/js/pi-storage.js
```

#### 3.2 Fix Initialize Flow

**File:** `static/js/lifecycle.js`

```javascript
// Proper initialization order:
// 1. Load Pi SDK
// 2. Initialize piAdapter
// 3. Check session cookie
// 4. Show login or dashboard

window.addEventListener('load', async () => {
    try {
        // 1. Initialize Pi adapter
        await piAdapter.init();
        
        // 2. Check if already authenticated
        const user = await piAdapter.checkSession();
        
        if (user) {
            // Show dashboard
            showDashboard();
        } else {
            // Show login
            showAuthSection();
        }
    } catch (error) {
        console.error('Init failed:', error);
        showError('Initialization failed. Please refresh.');
    }
});
```

#### 3.3 Fix Invoice QR Generation

**File:** `static/js/invoice.js`

```javascript
// Use Pi.createPayment() directly (Hackathon pattern)
async initiatePiPayment() {
    const amount = parseFloat(document.getElementById('total-pi-with-fee').textContent);
    const memo = `INV-${Math.random().toString(16).substring(2, 8)}`;
    
    try {
        // Step 1: Create payment
        const paymentData = {
            amount: amount,
            memo: memo,
            metadata: { invoice_id: this.id }
        };
        
        const callbacks = {
            onReadyForServerApproval: async (payment) => {
                // Verify with backend
                await fetch('/api/blockchain/verify', {
                    method: 'POST',
                    body: JSON.stringify(payment)
                });
            },
            onReadyForServerCompletion: async (payment) => {
                // Complete payment
                await fetch('/api/blockchain/complete', {
                    method: 'POST',
                    body: JSON.stringify(payment)
                });
            },
            onCancel: () => console.log('Payment cancelled'),
            onError: (error) => console.error('Payment error:', error)
        };
        
        // Step 2: Initiate payment
        await window.piAdapter.createPayment(paymentData, callbacks);
        
    } catch (error) {
        console.error('Payment failed:', error);
    }
}
```

---

### PHASE 4: TESTING & DEPLOYMENT (3 Days)

**Goal:** Validate against Pi Network and deploy

#### 4.1 Test Checklist

```
✅ AUTHENTICATION TESTS
- [ ] Login with Pi Browser (Pi Testnet)
- [ ] Session persists after refresh
- [ ] Logout clears cookie
- [ ] Invalid token rejected
- [ ] CORS headers present

✅ PAYMENT TESTS
- [ ] Create invoice
- [ ] Generate QR code
- [ ] Pi.createPayment() called
- [ ] Payment callbacks fire
- [ ] SSE notifications work

✅ SECURITY TESTS
- [ ] No debug code in production
- [ ] CSP headers enforced
- [ ] XSS protection (DOMPurify)
- [ ] HttpOnly cookies set
- [ ] HTTPS enforced

✅ BLOCKCHAIN TESTS
- [ ] Stellar account derivation works
- [ ] Memo validation (≤28 bytes)
- [ ] Circuit breaker activates
- [ ] Fallback to public API
```

#### 4.2 Performance Checkpoints

```
✅ Metrics to Monitor
- [ ] First load: < 3s
- [ ] Login: < 2s
- [ ] Invoice creation: < 1s
- [ ] QR generation: < 500ms
- [ ] SSE latency: < 1s

✅ Load Testing
- [ ] 100 concurrent users
- [ ] Rate limiter: 60 req/min
- [ ] Redis cache functional
```

---

## 🎯 DETAILED TASK BREAKDOWN

### TASK 1: Fix Pi Browser Authentication (3 Days)

**Prerequisites:**

- Pi Browser installed on device
- Pi Network account with KYC
- Pi Developer Portal access

**Steps:**

1. **Verify Pi Developer Portal Settings** (30 min)
   - Go to: <https://developer.minepi.com>
   - Open "Ledger ERP" application
   - Confirm settings:

     ```
     App URL: https://ledgererp.online
     Scopes: username
     Weblink: https://ledgererp.online
     ```

2. **Fix pi-adapter.js** (1 hour)
   - Change scopes to `['username']` only
   - Add proper error messages
   - Test in console

3. **Test Authentication** (1 hour)
   - Open Pi Browser
   - Navigate to: <https://ledgererp.online>
   - Click "Sign in with Pi Browser"
   - Check console for errors

4. **Fix Backend Endpoints** (1.5 hours)
   - Deploy fixed auth.py
   - Test /api/auth/login endpoint
   - Verify session cookie set

5. **Remove Debug Code** (30 min)
   - Clean pi-storage.js
   - Remove all debug endpoints
   - Verify no localhost URLs

---

### TASK 2: Fix Stellar Account Derivation (2 Days)

**Current Issue:** Cannot get Stellar account from Pi Network

**Solution:**

1. **Verify Backend Endpoint**

   ```python
   # app/routers/blockchain.py - verify exists
   @router.post("/get-stellar-account")
   ```

2. **Test Endpoint**

   ```bash
   curl -X POST http://localhost:8000/api/blockchain/get-stellar-account \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json"
   ```

3. **Fix Frontend Call** (pi-storage.js)

   ```javascript
   const response = await fetch('/api/blockchain/get-stellar-account', {
       method: 'POST',
       credentials: 'include'
   });
   ```

---

### TASK 3: Implement Hackathon Pattern (2 Days)

**Reference:** Blind_Lounge + Starmax patterns

**Key Components:**

1. **Payment Flow**
   - Create invoice → Generate QR → Pi.createPayment() → Backend verify → SSE notify

2. **Stellar Integration**
   - Store data as Account Data Entries
   - No private keys on frontend
   - All signing on backend

3. **Error Recovery**
   - onIncompletePaymentFound callback
   - Automatic transaction completion
   - User notification

---

## 📊 DEPLOYMENT TIMELINE

```
Week 1:
├─ Day 1-2: Phase 1 (Diagnostics)
├─ Day 3-4: Phase 2 (Backend)
└─ Day 5: Phase 3 (Frontend) Start

Week 2:
├─ Day 1-2: Phase 3 (Frontend) Complete
├─ Day 3-4: Phase 4 (Testing)
└─ Day 5: Deployment to Production
```

---

## 🔑 CRITICAL SUCCESS FACTORS

### 1. **Scope Minimization**

❌ WRONG: `['username', 'payments']`
✅ CORRECT: `['username']`

### 2. **App URL Exactness**

❌ WRONG: `https://www.ledgererp.online`, `https://ledgererp.online/`
✅ CORRECT: `https://ledgererp.online`

### 3. **No Debug Code in Production**

❌ WRONG: localhost endpoints, console.debug(), agent logging
✅ CORRECT: Clean implementation, production-only logging

### 4. **Session Management**

❌ WRONG: LocalStorage for tokens, in-memory cookies
✅ CORRECT: HttpOnly cookies, secure transport

### 5. **Error Handling**

❌ WRONG: Silent failures, bad error messages
✅ CORRECT: User-facing errors, detailed console logs

---

## 🚀 GO-LIVE CHECKLIST

- [ ] All authentication tests passing
- [ ] No debug code in codebase
- [ ] SSL/TLS certificate valid
- [ ] CSP headers deployed
- [ ] Rate limiting active
- [ ] Monitoring enabled
- [ ] Backup systems ready
- [ ] Team trained on procedures
- [ ] Documentation updated
- [ ] Incident response plan ready

---

## 📞 ESCALATION PATH

If authentication fails after Phase 1:

1. Check Pi Developer Portal app URL
2. Test with Pi SDK examples (not our app)
3. Contact Pi Developer Support: <support@pi.com>
4. Share: app URL, SDK version, error logs

---

**Document Version:** 1.0  
**Last Updated:** March 12, 2026  
**Next Review:** After Phase 1  
**Owned By:** CTO/Lead Developer
