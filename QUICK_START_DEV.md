# ⚡ QUICK START - 3-MINUTE SETUP FOR DEVELOPERS

## 🚀 First Time Setup (5 minutes)

### Prerequisites Check

```bash
# Check Python
python --version  # Should be 3.9+

# Check Node (if using)
node --version    # Should be 14+

# Check Git
git status        # Should show this repo
```

### 1. Install Backend Dependencies

```bash
cd c:\Users\pc\Desktop\Pi\ Ledger
pip install -r requirements.txt
```

### 2. Setup Environment File

```bash
# Copy example env
copy .env.example .env

# Edit .env with:
SECRET_KEY=your-super-secret-key-at-least-32-chars-long
ENVIRONMENT=development
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://localhost:8000
```

### 3. Start Backend

```bash
python -m app.main
# OR
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access Application

- Frontend: <http://localhost:8000/static/index.html>
- API Docs: <http://localhost:8000/docs>
- Health Check: <http://localhost:8000/>

---

## 🔧 QUICK FIX - Pi Browser Login Failed (10 minutes)

### Problem: "Cannot login with Pi Browser"

### Solution A: Check Scopes (2 minutes)

```javascript
// File: static/js/pi-adapter.js
// Line: 55

// CHANGE FROM:
const scopes = ['username', 'payments'];

// CHANGE TO:
const scopes = ['username'];

// Save file and refresh browser
```

### Solution B: Check Pi Developer Portal (5 minutes)

1. Go to: <https://developer.minepi.com/apps>
2. Click "Ledger ERP"
3. Find "App URL" field
4. Verify it says: `https://ledgererp.online` (exactly, no trailing slash)
5. Click Save
6. Wait 2 minutes
7. Try login again

### Solution C: Check Backend (3 minutes)

```bash
# Make sure backend is running
curl http://localhost:8000/blockchain/status

# Should return:
# {"status": "ok", "mode": "local", ...}

# If error, check:
# 1. Python running?
# 2. Port 8000 open?
# 3. Dependencies installed?
```

---

## 📝 MOST COMMON ISSUES & FIXES

### Issue 1: Pi SDK Not Loaded

**Error**: "Pi SDK not found"
**Fix**:

```html
<!-- Check static/index.html around line 1050 -->
<!-- Should have: -->
<script src="https://sdk.minepi.com/pi.js"></script>

<!-- If missing, add it before other scripts -->
```

### Issue 2: CORS Error in Console

**Error**: "Access to XMLHttpRequest blocked by CORS"
**Fix**:

```python
# File: app/main.py
# Around line 410

# Check CORS is enabled:
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# If CORS_ORIGINS in .env is wrong:
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### Issue 3: Session Cookie Not Set

**Error**: Login works but session doesn't persist
**Fix**:

```javascript
// File: static/js/pi-adapter.js
// Line: 88

// Add credentials: 'include'
const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',  // ← ADD THIS
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: authResult.accessToken })
});
```

### Issue 4: Debug Code Still in Pi Storage

**Error**: Network tab shows requests to 127.0.0.1:7243
**Fix**:

```bash
# Find all debug code
grep -r "127.0.0.1:7243" static/js/

# Remove all lines (in pi-storage.js)
# Search: // #region agent log
# Delete until: // #endregion

# Verify removed
grep -r "127.0.0.1" static/js/
# Should return nothing
```

---

## 🧪 QUICK TESTS

### Test 1: Backend Endpoints (2 minutes)

```bash
# Test API root
curl http://localhost:8000/

# Should return:
# {"message": "Ledger ERP API", "version": "1.0.0", ...}

# Test blockchain status
curl http://localhost:8000/blockchain/status

# Should return:
# {"status": "ok", "mode": "local", "circuit_open": false, ...}

# Test domain verification
curl http://localhost:8000/.well-known/pi-app-verification

# Should return text content
```

### Test 2: Frontend Load (1 minute)

```bash
# Open browser console
open http://localhost:8000/static/index.html

# In console, check:
console.log(typeof Pi)           # Should be 'function'
console.log(window.piAdapter)    # Should be object
console.log(window.securityManager)  # Should be object

# If all present, frontend is ready
```

### Test 3: Authentication (3 minutes)

```bash
# Open http://localhost:8000/static/index.html in Pi Browser
# Click "Sign in with Pi Browser"
# Check browser console for logs

# Should see:
# ✅ Pi SDK Initialized
# ✅ Authentication Successful
# ✅ Backend Session Initialized

# If fails, check .env and developer portal URL
```

---

## 🔍 DEBUGGING COMMANDS

### View Live Logs

```bash
# Backend logs
tail -f logs/server.log

# Or with grep for errors
grep "ERROR" logs/server.log | tail -20
```

### Check Port Usage

```powershell
# Check if port 8000 open
Get-NetTCPConnection -LocalPort 8000

# Kill process on that port (if needed)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
```

### Clear Cache & Cookies

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

### Test Pi SDK

```javascript
// In browser console (on Pi Browser):
console.log(Pi.init);
console.log(Pi.authenticate);
console.log(Pi.createPayment);

// Should all be functions
```

---

## 📋 DAILY WORKFLOW

### Morning (Start Work)

```bash
# 1. Pull latest
git pull origin main

# 2. Check for env changes
git diff .env.example

# 3. Install any new deps
pip install -r requirements.txt

# 4. Start backend
python -m app.main

# 5. Test frontend
open http://localhost:8000/static/index.html
```

### Development (During Day)

```bash
# 1. Make changes to files
# code static/js/pi-adapter.js

# 2. Browser auto-reloads (if hot reload enabled)
# OR manually refresh

# 3. Check console for errors
# 4. Check backend logs
# tail -f logs/server.log

# 5. Test in Pi Browser when ready
```

### Before Commit

```bash
# 1. Run tests
pytest tests/test_backend.py -v

# 2. Check console for errors
# 3. Remove debug code
grep -r "console.log" static/js/ | grep -v "production"

# 4. Lint JavaScript (if configured)
# eslint static/js/ --fix

# 5. Commit changes
git add -A
git commit -m "Fix: description"
git push origin branch-name
```

---

## 🆘 GET HELP

### Check These First

1. **Backend error?** → Look at `logs/server.log`
2. **Frontend error?** → Open browser DevTools (F12)
3. **Pi SDK error?** → Check browser console for `Pi.*`
4. **CORS error?** → Check `.env` CORS_ORIGINS setting
5. **Port error?** → Port 8000 in use, change or kill process

### Search for Answers

```bash
# Search codebase
grep -r "error message text" .

# Search docs
grep -r "issue name" docs/

# Search tests
cat tests/test_backend.py | grep -A 5 "test_name"
```

### Ask Team

- 📞 Contact CTO with logs and error message
- 📧 Email backend logs (logs/server.log)
- 🐞 Create GitHub issue with reproduction steps

---

## 🚀 DEPLOYMENT SHORTCUT

### Develop Locally

```bash
.env: ENVIRONMENT=development
```

### Deploy to Staging

```bash
.env: ENVIRONMENT=staging
# Test with Pi Testnet

# Run tests
pytest tests/ -v
```

### Deploy to Production

```bash
.env: ENVIRONMENT=production
# Requires validation-key.txt
# Requires valid SSL cert

# Run full test suite
pytest tests/ -v
pytest tests/test_backend.py -v -k "integration"
```

---

## 💡 PRO TIPS

### 1. Use Browser DevTools

```javascript
// Inspect network requests
// Open DevTools → Network tab
// See all API calls and responses
```

### 2. Log Strategically

```javascript
// Before:
console.log('Error:', error)

// After:
console.error('[Component] Error:', error, { context: details });
```

### 3. Test in Multiple Browsers

```bash
# Regular Chrome: For general testing
# Firefox: For different engine compatibility
# Pi Browser: For production-like environment
```

### 4. Use API Documentation

```
http://localhost:8000/docs
http://localhost:8000/redoc
# Interactive API testing
```

### 5. Monitor Rate Limiting

```
# Current: 60 requests per minute
# Check .env: RATE_LIMIT_REQUESTS_PER_MINUTE

# Monitor in logs if hitting limit
grep "rate.limit" logs/server.log
```

---

## 📚 IMPORTANT FILES TO KNOW

| File | Purpose |
|------|---------|
| `app/main.py` | Backend entry point |
| `static/index.html` | Frontend entry point |
| `static/js/pi-adapter.js` | Pi SDK integration |
| `app/routers/auth.py` | Authentication |
| `app/core/security.py` | Security layer |
| `static/js/security.js` | Encryption |
| `.env` | Configuration |
| `requirements.txt` | Dependencies |
| `tests/test_backend.py` | Backend tests |

---

## ✅ READY TO START?

1. ✅ Backend running? → <http://localhost:8000> should respond
2. ✅ Frontend loads? → <http://localhost:8000/static/index.html>
3. ✅ Pi SDK ready? → Browser console shows Pi object
4. ✅ Scopes fixed? → pi-adapter.js has ['username'] only
5. ✅ Ready to test? → Open in Pi Browser

**Next Step**: Read `CTO_MASTER_PLAN.md` for full roadmap

---

**Document Version:** 1.0  
**Audience:** Development Team (All Levels)  
**Last Updated:** March 12, 2026  
**Maintenance:** CTO
