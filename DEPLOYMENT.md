# Pi Ledger - دليل التشغيل والتوزيع / Deployment Guide

**تاريخ التحديث:** 12 ديسمبر 2025  
**الإصدار:** v1.0.0

---

## 📋 جدول المحتويات / Table of Contents

### [العربية](#العربية-1)
1. [المتطلبات الأساسية](#1-المتطلبات-الأساسية)
2. [الإعداد للتطوير المحلي](#2-الإعداد-للتطوير-المحلي)
3. [تشغيل التطبيق](#3-تشغيل-التطبيق)
4. [تشغيل الاختبارات](#4-تشغيل-الاختبارات)
5. [النشر للإنتاج](#5-النشر-للإنتاج)
6. [متغيرات البيئة](#6-متغيرات-البيئة)
7. [استكشاف الأخطاء](#7-استكشاف-الأخطاء)

### [English](#english-1)
1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Running the Application](#3-running-the-application)
4. [Running Tests](#4-running-tests)
5. [Production Deployment](#5-production-deployment)
6. [Environment Variables](#6-environment-variables)
7. [Troubleshooting](#7-troubleshooting)

---

# العربية

## 1. المتطلبات الأساسية

### البرمجيات المطلوبة:

| البرنامج | الإصدار المطلوب | الغرض |
|---------|-----------------|-------|
| **Python** | 3.11+ | Backend FastAPI |
| **pip** | أحدث إصدار | إدارة حزم Python |
| **Git** | أحدث إصدار | التحكم بالإصدارات |
| **Node.js** *(اختياري)* | 18+ | أدوات التطوير الإضافية |

### فحص التثبيت:
```bash
# التحقق من Python
python --version
# يجب أن يظهر: Python 3.11.x أو أعلى

# التحقق من pip
pip --version

# التحقق من Git
git --version
```

---

## 2. الإعداد للتطوير المحلي

### الخطوة 1: استنساخ المستودع
```bash
git clone https://github.com/YourUsername/Pi-Ledger.git
cd Pi-Ledger
```

### الخطوة 2: إنشاء بيئة افتراضية (موصى به بشدة)

**على Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**على Windows (CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

**على Linux/macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### الخطوة 3: تثبيت التبعيات
```bash
# تثبيت جميع المكتبات المطلوبة
pip install -r requirements.txt

# التحقق من التثبيت
pip list
```

**التبعيات الرئيسية:**
- `fastapi` - إطار عمل الـ Web Framework
- `uvicorn[standard]` - ASGI server
- `pydantic` + `pydantic-settings` - التحقق من الإعدادات
- `python-jose[cryptography]` - التشفير والأمان
- `reportlab` - توليد تقارير PDF
- `aiohttp` - طلبات HTTP غير متزامنة

### الخطوة 4: إعداد ملف البيئة `.env`

أنشئ ملف `.env` في المجلد الجذري:

```bash
# انسخ القالب
cp .env.example .env

# أو أنشئ ملف جديد
touch .env
```

**محتوى `.env` الأساسي:**
```env
# Backend Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True
LOG_LEVEL=INFO

# Pi Network Configuration
PI_API_KEY=your_pi_api_key_here
PI_WALLET_PRIVATE_SEED=your_wallet_seed_here
MERCHANT_ID=your_merchant_id_here

# Blockchain Endpoints
LOCAL_NODE_URL=http://localhost:8545
PUBLIC_API_URL=https://api.minepi.com

# Security
SECRET_KEY=generate_a_secure_random_key_here
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.pi

# Log Rotation (Req #45)
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
```

**⚠️ تحذير أمني:**
- **لا تشارك** ملف `.env` أبداً في Git
- استخدم `python -c "import secrets; print(secrets.token_urlsafe(32))"` لتوليد `SECRET_KEY`
- تأكد من أن `.env` مضاف في `.gitignore`

---

## 3. تشغيل التطبيق

### الطريقة 1: تشغيل مباشر (التطوير)

```bash
# من المجلد الجذري للمشروع
python -m app.main
```

**أو باستخدام Uvicorn مع إعادة التحميل التلقائي:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### الطريقة 2: باستخدام سكريبت التشغيل (Windows)

```powershell
# يشغّل Backend تلقائياً
.\run_app.bat
```

### التحقق من التشغيل:

1. **الصفحة الرئيسية:**  
   افتح المتصفح على: `http://localhost:8000/`

2. **واجهة التطبيق:**  
   `http://localhost:8000/static/index.html`

3. **API Documentation (Swagger):**  
   `http://localhost:8000/docs`

4. **فحص الصحة:**  
   ```bash
   curl http://localhost:8000/blockchain/status
   ```

**الإخراج المتوقع:**
```json
{
  "status": "online",
  "mode": "local_node",
  "network": "Pi Testnet"
}
```

---

## 4. تشغيل الاختبارات

### اختبارات Backend (pytest)

**تشغيل جميع الاختبارات:**
```bash
pytest tests/test_backend.py -v
```

**اختبار ملف محدد:**
```bash
pytest tests/test_backend.py::test_csp_headers -v
```

**تشغيل مع تقرير التغطية:**
```bash
pytest tests/test_backend.py --cov=app --cov-report=html
```

**النتيجة المتوقعة:**
```
======================== test session starts =========================
collected 11 items

tests/test_backend.py::test_api_root PASSED                     [  9%]
tests/test_backend.py::test_domain_verify PASSED                [ 18%]
tests/test_backend.py::test_static_index_html PASSED            [ 27%]
tests/test_backend.py::test_blockchain_status PASSED            [ 36%]
tests/test_backend.py::test_csp_headers PASSED                  [ 45%]
tests/test_backend.py::test_version_header PASSED               [ 54%]
tests/test_backend.py::test_rate_limiting PASSED                [ 63%]
tests/test_backend.py::test_vault_endpoints PASSED              [ 72%]
tests/test_backend.py::test_reports_endpoint PASSED             [ 81%]
tests/test_backend.py::test_telemetry_endpoint PASSED           [ 90%]
tests/test_backend.py::test_js_files_exist PASSED               [100%]

========================= 11 passed in 5.83s =========================
```

### اختبارات Frontend (Browser Tests)

1. **شغّل Backend:**
   ```bash
   python -m app.main
   ```

2. **افتح Test Suite:**  
   `http://localhost:8000/static/test_suite.html`

3. **اضغط "Run All Tests"**

**النتيجة المتوقعة:**  
✅ **11/11 Tests Passed**

**الاختبارات المغطاة:**
- BIP-39 Mnemonic Generation
- AES-GCM Encryption/Decryption
- Input Sanitization (DOMPurify)
- IndexedDB Operations
- Pi Adapter Integration
- Anti-Phishing Validation
- Module Loading

### اختبار شامل (All Endpoints)

```bash
pytest tests/test_backend.py -v
```

**الإخراج:**
```
🧪 Testing Pi Ledger Backend...
✅ GET /: 200 OK
✅ GET /.well-known/pi-app-verification: 200 OK
✅ GET /static/index.html: 200 OK
✅ GET /blockchain/status: 200 OK
...
📊 Test Summary: 15/15 passed ✅
```

---

## 5. النشر للإنتاج

### الخطوة 1: التحضيرات الأمنية

**1.1 تحديث `.env` للإنتاج:**
```env
DEBUG=False
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://yourapp.pi,https://yourapp.com
SECRET_KEY=<STRONG_RANDOM_KEY_HERE>
```

**1.2 تفعيل HTTPS:**
- استخدم شهادة SSL صالحة (Let's Encrypt موصى بها)
- أجبر جميع الاتصالات على HTTPS

**1.3 فحص الأمان:**
```bash
# فحص التبعيات للثغرات
pip check

# فحص المكتبات القديمة
pip list --outdated
```

### الخطوة 2: النشر على VPS/Cloud

#### خيار A: باستخدام Systemd (Ubuntu/Debian)

**2.1 إنشاء ملف Service:**
```bash
sudo nano /etc/systemd/system/pi-ledger.service
```

**محتوى `pi-ledger.service`:**
```ini
[Unit]
Description=Pi Ledger FastAPI Backend
After=network.target

[Service]
Type=simple
User=pi-ledger
WorkingDirectory=/opt/pi-ledger
Environment="PATH=/opt/pi-ledger/.venv/bin"
ExecStart=/opt/pi-ledger/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**2.2 تفعيل وتشغيل الخدمة:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable pi-ledger
sudo systemctl start pi-ledger

# فحص الحالة
sudo systemctl status pi-ledger

# عرض السجلات
sudo journalctl -u pi-ledger -f
```

#### خيار B: باستخدام Docker

**2.1 إنشاء `Dockerfile`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# تثبيت التبعيات
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ التطبيق
COPY . .

# منفذ التطبيق
EXPOSE 8000

# تشغيل التطبيق
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**2.2 بناء وتشغيل Container:**
```bash
# بناء الصورة
docker build -t pi-ledger:latest .

# تشغيل Container
docker run -d \
  --name pi-ledger \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  pi-ledger:latest

# فحص السجلات
docker logs -f pi-ledger
```

### الخطوة 3: إعداد Reverse Proxy (Nginx)

**3.1 تثبيت Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

**3.2 إنشاء ملف الإعداد:**
```bash
sudo nano /etc/nginx/sites-available/pi-ledger
```

**محتوى الملف:**
```nginx
server {
    listen 80;
    server_name yourapp.pi yourapp.com;

    # إعادة توجيه HTTP إلى HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourapp.pi yourapp.com;

    # شهادات SSL
    ssl_certificate /etc/letsencrypt/live/yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourapp.com/privkey.pem;

    # الأمان
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # حماية CSP (إضافية)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://sdk.minepi.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.minepi.com;" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy إلى FastAPI
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # دعم SSE (Server-Sent Events)
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
    }

    # Static files caching
    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

**3.3 تفعيل الموقع:**
```bash
sudo ln -s /etc/nginx/sites-available/pi-ledger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### الخطوة 4: الحصول على شهادة SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourapp.pi -d yourapp.com
```

### الخطوة 5: التحقق من النشر

```bash
# فحص HTTPS
curl -I https://yourapp.pi

# فحص API
curl https://yourapp.pi/blockchain/status

# فحص CSP Headers
curl -I https://yourapp.pi/static/index.html | grep -i content-security
```

---

## 6. متغيرات البيئة

### القائمة الكاملة لمتغيرات `.env`:

```env
# ========================================
# Backend Configuration
# ========================================
HOST=0.0.0.0                          # عنوان الاستماع (0.0.0.0 للإنتاج)
PORT=8000                              # منفذ التطبيق
DEBUG=False                            # وضع التطوير (False للإنتاج)
LOG_LEVEL=INFO                         # مستوى السجلات (DEBUG/INFO/WARNING/ERROR)

# ========================================
# Pi Network Integration
# ========================================
PI_API_KEY=your_api_key                # مفتاح Pi API
PI_WALLET_PRIVATE_SEED=your_seed       # بذرة المحفظة (سرية!)
MERCHANT_ID=your_merchant_id           # معرّف التاجر

# ========================================
# Blockchain Endpoints (Req #22)
# ========================================
LOCAL_NODE_URL=http://localhost:8545   # عقدة محلية (اختياري)
PUBLIC_API_URL=https://api.minepi.com  # API العامة (احتياطي)

# ========================================
# Security Settings
# ========================================
SECRET_KEY=<GENERATE_RANDOM_KEY>       # مفتاح تشفير JWT
ALLOWED_ORIGINS=http://localhost:8000  # نطاقات CORS المسموحة

# ========================================
# Rate Limiting (Req #26)
# ========================================
RATE_LIMIT_REQUESTS=60                 # عدد الطلبات المسموحة
RATE_LIMIT_WINDOW=60                   # نافذة الوقت (ثانية)

# ========================================
# Log Rotation (Req #45)
# ========================================
LOG_MAX_BYTES=10485760                 # حجم السجل الأقصى (10MB)
LOG_BACKUP_COUNT=5                     # عدد النسخ الاحتياطية

# ========================================
# Circuit Breaker (Req #23)
# ========================================
CIRCUIT_FAILURE_THRESHOLD=5            # عتبة الفشل
CIRCUIT_TIMEOUT_SECONDS=60             # وقت إعادة المحاولة

# ========================================
# SSE Configuration (Req #31)
# ========================================
SSE_PING_INTERVAL=30                   # فاصل ping (ثانية)
SSE_RETRY_TIMEOUT=5000                 # وقت إعادة المحاولة (ms)
```

---

## 7. استكشاف الأخطاء

### المشكلة 1: `ModuleNotFoundError: No module named 'pydantic_settings'`

**الحل:**
```bash
pip install pydantic-settings
```

### المشكلة 2: Backend لا يبدأ - خطأ في Port

**الأعراض:**
```
ERROR: [Errno 48] Address already in use
```

**الحل:**
```bash
# العثور على العملية التي تستخدم المنفذ 8000
# Windows:
netstat -ano | findstr :8000

# Linux/macOS:
lsof -i :8000

# إيقاف العملية
kill -9 <PID>
```

### المشكلة 3: CSP Errors في المتصفح

**الأعراض:**
```
Refused to load the script because it violates the following Content Security Policy directive
```

**الحل:**
- تحقق من أن جميع المكتبات في `static/libs/` (ليس CDN)
- تحقق من عدم وجود `style="..."` inline في HTML
- راجع `add_security_headers()` في `app/main.py`

### المشكلة 4: Pi Authentication فاشل في localhost

**السبب:**  
Pi SDK لا يعمل على `localhost` في وضع الإنتاج.

**الحل:**
- استخدم **Demo Mode** للاختبار المحلي
- أو استخدم ngrok لإنشاء tunnel عام:
  ```bash
  ngrok http 8000
  ```

### المشكلة 5: الاختبارات تفشل بعد التحديث

**الحل:**
```bash
# حذف cache
rm -rf __pycache__ tests/__pycache__ app/__pycache__

# إعادة تثبيت التبعيات
pip install --upgrade -r requirements.txt

# إعادة تشغيل الاختبارات
pytest tests/test_backend.py -v --cache-clear
```

### المشكلة 6: السجلات تملأ القرص

**الحل:**
- تحقق من إعدادات Log Rotation في `.env`:
  ```env
  LOG_MAX_BYTES=10485760
  LOG_BACKUP_COUNT=5
  ```
- أو احذف السجلات القديمة يدوياً:
  ```bash
  rm logs/server.log.*
  ```

### المشكلة 7: Permission Denied عند التشغيل

**الحل (Linux/macOS):**
```bash
# إعطاء صلاحيات تنفيذ
chmod +x run_app.sh
sudo chown -R pi-ledger:pi-ledger /opt/pi-ledger
```

---

## 📞 الدعم الفني / Technical Support

- **الوثائق الكاملة:** [README.md](README.md)
- **API Reference:** `http://localhost:8000/docs`
- **الأمان:** راجع [SECURITY_HARDENING.md](SECURITY_HARDENING.md)
- **المتطلبات:** راجع [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md)
- **الاختبار:** راجع [tests/README.md](tests/README.md)

---

# English

## 1. Prerequisites

### Required Software:

| Software | Required Version | Purpose |
|----------|------------------|---------|
| **Python** | 3.11+ | Backend FastAPI |
| **pip** | Latest | Python package manager |
| **Git** | Latest | Version control |
| **Node.js** *(optional)* | 18+ | Additional dev tools |

### Verify Installation:
```bash
# Check Python
python --version
# Should show: Python 3.11.x or higher

# Check pip
pip --version

# Check Git
git --version
```

---

## 2. Local Development Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/YourUsername/Pi-Ledger.git
cd Pi-Ledger
```

### Step 2: Create Virtual Environment (Highly Recommended)

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On Windows (CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

**On Linux/macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
# Install all required packages
pip install -r requirements.txt

# Verify installation
pip list
```

**Key Dependencies:**
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `pydantic` + `pydantic-settings` - Config validation
- `python-jose[cryptography]` - Encryption & security
- `reportlab` - PDF generation
- `aiohttp` - Async HTTP requests

### Step 4: Setup `.env` File

Create `.env` in project root:

```bash
# Copy template
cp .env.example .env

# Or create new file
touch .env
```

**Basic `.env` contents:**
```env
# Backend Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True
LOG_LEVEL=INFO

# Pi Network Configuration
PI_API_KEY=your_pi_api_key_here
PI_WALLET_PRIVATE_SEED=your_wallet_seed_here
MERCHANT_ID=your_merchant_id_here

# Blockchain Endpoints
LOCAL_NODE_URL=http://localhost:8545
PUBLIC_API_URL=https://api.minepi.com

# Security
SECRET_KEY=generate_a_secure_random_key_here
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.pi

# Log Rotation (Req #45)
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
```

**⚠️ Security Warning:**
- **Never** share `.env` file in Git
- Use `python -c "import secrets; print(secrets.token_urlsafe(32))"` to generate `SECRET_KEY`
- Ensure `.env` is in `.gitignore`

---

## 3. Running the Application

### Method 1: Direct Run (Development)

```bash
# From project root
python -m app.main
```

**Or using Uvicorn with auto-reload:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Method 2: Using Run Script (Windows)

```powershell
# Auto-starts Backend
.\run_app.bat
```

### Verify Running:

1. **Home Page:**  
   Open browser at: `http://localhost:8000/`

2. **Application UI:**  
   `http://localhost:8000/static/index.html`

3. **API Documentation (Swagger):**  
   `http://localhost:8000/docs`

4. **Health Check:**  
   ```bash
   curl http://localhost:8000/blockchain/status
   ```

**Expected Output:**
```json
{
  "status": "online",
  "mode": "local_node",
  "network": "Pi Testnet"
}
```

---

## 4. Running Tests

### Backend Tests (pytest)

**Run all tests:**
```bash
pytest tests/test_backend.py -v
```

**Test specific file:**
```bash
pytest tests/test_backend.py::test_csp_headers -v
```

**Run with coverage report:**
```bash
pytest tests/test_backend.py --cov=app --cov-report=html
```

**Expected Result:**
```
======================== test session starts =========================
collected 11 items

tests/test_backend.py::test_api_root PASSED                     [  9%]
tests/test_backend.py::test_domain_verify PASSED                [ 18%]
tests/test_backend.py::test_static_index_html PASSED            [ 27%]
tests/test_backend.py::test_blockchain_status PASSED            [ 36%]
tests/test_backend.py::test_csp_headers PASSED                  [ 45%]
tests/test_backend.py::test_version_header PASSED               [ 54%]
tests/test_backend.py::test_rate_limiting PASSED                [ 63%]
tests/test_backend.py::test_vault_endpoints PASSED              [ 72%]
tests/test_backend.py::test_reports_endpoint PASSED             [ 81%]
tests/test_backend.py::test_telemetry_endpoint PASSED           [ 90%]
tests/test_backend.py::test_js_files_exist PASSED               [100%]

========================= 11 passed in 5.83s =========================
```

### Frontend Tests (Browser Tests)

1. **Start Backend:**
   ```bash
   python -m app.main
   ```

2. **Open Test Suite:**  
   `http://localhost:8000/static/test_suite.html`

3. **Click "Run All Tests"**

**Expected Result:**  
✅ **11/11 Tests Passed**

**Tests Covered:**
- BIP-39 Mnemonic Generation
- AES-GCM Encryption/Decryption
- Input Sanitization (DOMPurify)
- IndexedDB Operations
- Pi Adapter Integration
- Anti-Phishing Validation
- Module Loading

### Comprehensive Test (All Endpoints)

```bash
pytest tests/test_backend.py -v
```

**Output:**
```
🧪 Testing Pi Ledger Backend...
✅ GET /: 200 OK
✅ GET /.well-known/pi-app-verification: 200 OK
✅ GET /static/index.html: 200 OK
✅ GET /blockchain/status: 200 OK
...
📊 Test Summary: 15/15 passed ✅
```

---

## 5. Production Deployment

### Step 1: Security Preparations

**1.1 Update `.env` for Production:**
```env
DEBUG=False
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://yourapp.pi,https://yourapp.com
SECRET_KEY=<STRONG_RANDOM_KEY_HERE>
```

**1.2 Enable HTTPS:**
- Use valid SSL certificate (Let's Encrypt recommended)
- Force all connections to HTTPS

**1.3 Security Scan:**
```bash
# Check dependencies for vulnerabilities
pip check

# Check outdated packages
pip list --outdated
```

### Step 2: Deploy to VPS/Cloud

#### Option A: Using Systemd (Ubuntu/Debian)

**2.1 Create Service File:**
```bash
sudo nano /etc/systemd/system/pi-ledger.service
```

**`pi-ledger.service` contents:**
```ini
[Unit]
Description=Pi Ledger FastAPI Backend
After=network.target

[Service]
Type=simple
User=pi-ledger
WorkingDirectory=/opt/pi-ledger
Environment="PATH=/opt/pi-ledger/.venv/bin"
ExecStart=/opt/pi-ledger/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**2.2 Enable and Start Service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable pi-ledger
sudo systemctl start pi-ledger

# Check status
sudo systemctl status pi-ledger

# View logs
sudo journalctl -u pi-ledger -f
```

#### Option B: Using Docker

**2.1 Create `Dockerfile`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**2.2 Build and Run Container:**
```bash
# Build image
docker build -t pi-ledger:latest .

# Run container
docker run -d \
  --name pi-ledger \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  pi-ledger:latest

# Check logs
docker logs -f pi-ledger
```

### Step 3: Setup Reverse Proxy (Nginx)

**3.1 Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

**3.2 Create Configuration File:**
```bash
sudo nano /etc/nginx/sites-available/pi-ledger
```

**File contents:**
```nginx
server {
    listen 80;
    server_name yourapp.pi yourapp.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourapp.pi yourapp.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourapp.com/privkey.pem;

    # Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # CSP Protection (additional)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://sdk.minepi.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.minepi.com;" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy to FastAPI
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Support SSE (Server-Sent Events)
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
    }

    # Static files caching
    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

**3.3 Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/pi-ledger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Obtain SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourapp.pi -d yourapp.com
```

### Step 5: Verify Deployment

```bash
# Check HTTPS
curl -I https://yourapp.pi

# Check API
curl https://yourapp.pi/blockchain/status

# Check CSP Headers
curl -I https://yourapp.pi/static/index.html | grep -i content-security
```

---

## 6. Environment Variables

### Complete `.env` Variables List:

```env
# ========================================
# Backend Configuration
# ========================================
HOST=0.0.0.0                          # Listen address (0.0.0.0 for production)
PORT=8000                              # Application port
DEBUG=False                            # Development mode (False for production)
LOG_LEVEL=INFO                         # Log level (DEBUG/INFO/WARNING/ERROR)

# ========================================
# Pi Network Integration
# ========================================
PI_API_KEY=your_api_key                # Pi API key
PI_WALLET_PRIVATE_SEED=your_seed       # Wallet seed (secret!)
MERCHANT_ID=your_merchant_id           # Merchant identifier

# ========================================
# Blockchain Endpoints (Req #22)
# ========================================
LOCAL_NODE_URL=http://localhost:8545   # Local node (optional)
PUBLIC_API_URL=https://api.minepi.com  # Public API (fallback)

# ========================================
# Security Settings
# ========================================
SECRET_KEY=<GENERATE_RANDOM_KEY>       # JWT encryption key
ALLOWED_ORIGINS=http://localhost:8000  # CORS allowed domains

# ========================================
# Rate Limiting (Req #26)
# ========================================
RATE_LIMIT_REQUESTS=60                 # Allowed requests count
RATE_LIMIT_WINDOW=60                   # Time window (seconds)

# ========================================
# Log Rotation (Req #45)
# ========================================
LOG_MAX_BYTES=10485760                 # Max log size (10MB)
LOG_BACKUP_COUNT=5                     # Backup copies count

# ========================================
# Circuit Breaker (Req #23)
# ========================================
CIRCUIT_FAILURE_THRESHOLD=5            # Failure threshold
CIRCUIT_TIMEOUT_SECONDS=60             # Retry timeout

# ========================================
# SSE Configuration (Req #31)
# ========================================
SSE_PING_INTERVAL=30                   # Ping interval (seconds)
SSE_RETRY_TIMEOUT=5000                 # Retry timeout (ms)
```

---

## 7. Troubleshooting

### Issue 1: `ModuleNotFoundError: No module named 'pydantic_settings'`

**Solution:**
```bash
pip install pydantic-settings
```

### Issue 2: Backend Won't Start - Port Error

**Symptoms:**
```
ERROR: [Errno 48] Address already in use
```

**Solution:**
```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000

# Linux/macOS:
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Issue 3: CSP Errors in Browser

**Symptoms:**
```
Refused to load the script because it violates the following Content Security Policy directive
```

**Solution:**
- Verify all libraries are in `static/libs/` (not CDN)
- Check no `style="..."` inline in HTML
- Review `add_security_headers()` in `app/main.py`

### Issue 4: Pi Authentication Fails on localhost

**Reason:**  
Pi SDK doesn't work on `localhost` in production mode.

**Solution:**
- Use **Demo Mode** for local testing
- Or use ngrok to create public tunnel:
  ```bash
  ngrok http 8000
  ```

### Issue 5: Tests Fail After Update

**Solution:**
```bash
# Clear cache
rm -rf __pycache__ tests/__pycache__ app/__pycache__

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Re-run tests
pytest tests/test_backend.py -v --cache-clear
```

### Issue 6: Logs Fill Disk Space

**Solution:**
- Check Log Rotation settings in `.env`:
  ```env
  LOG_MAX_BYTES=10485760
  LOG_BACKUP_COUNT=5
  ```
- Or manually delete old logs:
  ```bash
  rm logs/server.log.*
  ```

### Issue 7: Permission Denied When Running

**Solution (Linux/macOS):**
```bash
# Grant execution permissions
chmod +x run_app.sh
sudo chown -R pi-ledger:pi-ledger /opt/pi-ledger
```

---

## 📞 Technical Support

- **Full Documentation:** [README.md](README.md)
- **API Reference:** `http://localhost:8000/docs`
- **Security:** See [SECURITY_HARDENING.md](SECURITY_HARDENING.md)
- **Requirements:** See [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md)
- **Testing:** See [tests/README.md](tests/README.md)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-12 | Initial deployment guide (AR/EN) |

---

## 📄 License

Proprietary - All Rights Reserved © 2025 Pi Ledger

**⚠️ This deployment guide is for authorized developers only.**
