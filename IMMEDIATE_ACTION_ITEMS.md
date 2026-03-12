# ⚡ الخطوات الفورية - ابدأ الآن (Next 4 Hours)

**التاريخ**: March 12, 2026  
**الأولوية**: CRITICAL  
**الهدف**: إزالة security risks قبل أي عمل آخر  

---

## الخطوة 1: إزالة Debug Code (45 دقيقة)

### الأمر الأول

```bash
# في terminal في مجلد المشروع
cd "c:\Users\pc\Desktop\Pi Ledger"

# البحث الشامل
grep -r "127.0.0.1:7243" static/js/
grep -r "#region agent log" static/js/
grep -r "#endregion" static/js/
```

**النتيجة المتوقعة:**

```
static/js/pi-storage.js:25:// #region agent log
static/js/pi-storage.js:63:// #endregion
```

### الحل

افتح `static/js/pi-storage.js` و:

1. **محرر**: VSCode (الأفضل)
2. **ابحث عن**: `// #region agent log`
3. **احذف**: كل الأسطر من `// #region agent log` إلى `// #endregion` (شامل)
4. **تحقق**: لا يوجد `127.0.0.1`

```bash
# تحقق أن لا يوجد شيء متبقي
grep "127.0.0.1" static/js/*.js
grep "7243" static/js/*.js
# يجب أن يرجع: (no results)
```

---

## الخطوة 2: تصحيح Scopes في Pi Auth (15 دقيقة)

### افتح: `static/js/pi-adapter.js`

**ابحث عن السطر**:

```javascript
const scopes = ['username', 'payments'];
```

**استبدل به**:

```javascript
const scopes = ['username'];
```

**حفظ وتحقق**:

```bash
grep "const scopes" static/js/pi-adapter.js
# يجب يرجع: const scopes = ['username'];
```

---

## الخطوة 3: إصلاح Salt في PBKDF2 (20 دقيقة)

### افتح: `static/js/security.js`

**ابحث عن**:

```javascript
salt: encoder.encode('pi-ledger-salt'),
```

**استبدل به**:

```javascript
// Generate random salt (16 bytes)
const salt = crypto.getRandomValues(new Uint8Array(16));
```

**التغيير الكامل:**

البحث عن الدالة `deriveEncryptionKey` و غيّر الجزء الخاص بـ PBKDF2:

```javascript
async deriveEncryptionKey(mnemonic, pinCode) {
    try {
        const combined = `${mnemonic}:${pinCode}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(combined);
        
        // ✅ NEW: Random salt
        const salt = crypto.getRandomValues(new Uint8Array(16));

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            data,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        this.encryptionKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,  // ✅ Use random salt
                iterations: 100000,
                hash: 'SHA-256'
            },
            // ... والباقي كما هو
```

---

## الخطوة 4: اختبار سريع (30 دقيقة)

### 4.1 شغّل الخادم

```bash
# في PowerShell terminal
cd "c:\Users\pc\Desktop\Pi Ledger"
python -m app.main

# يجب ترى:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4.2 اختبر البيانات

```bash
# في terminal جديد، في نفس المجلد

# اختبر API root
curl http://localhost:8000/
# يجب يرجع: {"message": "Ledger ERP API", ...}

# اختبر blockchain status
curl http://localhost:8000/blockchain/status
# يجب يرجع: {"status": "ok", "mode": "local", ...}
```

### 4.3 فتح في المتصفح

1. الرابط: `http://localhost:8000/static/index.html`
2. افتح **Developer Console** (F12)
3. اختبر **الأخطاء**:
   - ❌ لا يجب تشوف `127.0.0.1:7243`
   - ❌ لا يجب تشوف `CORS errors`
   - ✅ يجب تشوف `"Ledger ERP" loaded`

---

## الخطوة 5: Commit التغييرات (15 دقيقة)

```bash
# تأكد أن جميع الملفات محفوظة

# شف التغييرات
git status

# أضف التغييرات
git add static/js/pi-adapter.js
git add static/js/security.js
git add static/js/pi-storage.js

# تحقق قبل التأكيد
git diff --cached

# اكتب رسالة commit واضحة
git commit -m "🔒 SECURITY: Fix critical issues

- Remove debug endpoints (localhost:7243)
- Fix PBKDF2 salt (use random instead of fixed)
- Correct Pi auth scopes to ['username'] only
- Ensure Zero-Knowledge compliance

Fixes: #CRITICAL-AUTH"

# أرسل للـ remote
git push origin main
```

---

## الخطوة 6: التحقق النهائي (30 دقيقة)

### فحص شامل

```bash
# 1. تأكد من عدم وجود debug code
echo "=== Checking for debug code ==="
grep -r "127.0.0.1" static/js/ || echo "✅ No localhost references"
grep -r "7243" static/js/ || echo "✅ No debug ports"
grep -r "#region agent" static/js/ || echo "✅ No agent logs"

# 2. تأكد من scopes الصحيح
echo "=== Checking scopes ==="
grep "const scopes" static/js/pi-adapter.js

# 3. تأكد من Salt الصحيح
echo "=== Checking salt ==="
grep "getRandomValues" static/js/security.js || echo "❌ Salt not random"

# 4. تشغيل tests
echo "=== Running tests ==="
pytest tests/test_backend.py -v
```

**النتيجة المتوقعة:**

```
✅ No localhost references
✅ No debug ports
✅ No agent logs
✅ const scopes = ['username'];
✅ Random salt generated
✅ All tests passed
```

---

## رابط التحقق السريع

بعد الانتهاء من الخطوات 1-6، شغّل:

```bash
# في root directory
python scripts/verify_local_setup.py

# يجب يرجع:
# ✅ Backend running
# ✅ Static files accessible
# ✅ No debug code found
# ✅ Security checks passed
```

---

## إذا عليت مشكلة

### مشكلة 1: "Cannot find pi-storage.js"

```bash
# تأكد أنك في المجلد الصحيح
ls static/js/pi-storage.js
# يجب يرجع: static/js/pi-storage.js
```

### مشكلة 2: "grep command not found"

```bash
# استخدم PowerShell دلاً من grep
Select-String -Path "static/js/*.js" -Pattern "127.0.0.1"
```

### مشكلة 3: "Failed to commit"

```bash
# تأكد أن git مثبت
git --version

# تأكد أنك في repo صحيح
git status

# لو مازالت مشكلة، اطلب help
```

---

## Progress Tracking

| الخطوة | الحالة | الوقت المتوقع |
|--------|--------|-------------|
| 1. إزالة Debug Code | ⏳ في الانتظار | 45 دقيقة |
| 2. تصحيح Scopes | ⏳ في الانتظار | 15 دقيقة |
| 3. إصلاح Salt | ⏳ في الانتظار | 20 دقيقة |
| 4. اختبار سريع | ⏳ في الانتظار | 30 دقيقة |
| 5. Commit | ⏳ في الانتظار | 15 دقيقة |
| 6. تحقق نهائي | ⏳ في الانتظار | 30 دقيقة |

**الإجمالي**: 2.5 ساعة

---

## بعد الانتهاء

✅ **الخطوة التالية**: اتبع `PROFESSIONAL_EXECUTION_ROADMAP.md` للمراحل المتبقية

✅ **قبل الإطلاق**: تأكد من جميع الخطوات في checklist

✅ **بعد الإطلاق**: راقب logs للأسبوع الأول

---

**ملاحظة من CTO:**

> لا تتخطى أي خطوة. الأمان أولاً. كل تفصيل مهم.
> اقرأ الأخطاء بعناية. اطلب مساعدة لو احتجت.
