# Scripts Directory - أدوات مساعدة

هذا المجلد يحتوي على سكريبتات مساعدة لإعداد واختبار التطبيق قبل الرفع إلى Pi Network.

## السكريبتات المتوفرة

### 1. check_submission_readiness.py
**الوصف**: يتحقق من جاهزية التطبيق للرفع إلى Pi App Studio

**الاستخدام**:
```bash
python scripts/check_submission_readiness.py
```

**الوظائف**:
- يتحقق من استبدال جميع الـ placeholders
- يفحص manifest.json
- يتحقق من ملف .env (إن وجد)
- يفحص Screenshots
- يتحقق من Security Headers في الكود
- يفحص Pi SDK Integration
- يتحقق من Backend Endpoints

### 2. verify_local_setup.py
**الوصف**: يتحقق من الملفات المحلية والتكوين

**الاستخدام**:
```bash
python scripts/verify_local_setup.py
```

**الوظائف**:
- يتحقق من وجود جميع الملفات المطلوبة
- يفحص manifest.json
- يتحقق من Domain Verification
- يفحص Icons و Screenshots
- يعطي تقرير شامل

### 3. generate_secret_key.py
**الوصف**: يولد SECRET_KEY قوي للإنتاج

**الاستخدام**:
```bash
python scripts/generate_secret_key.py
```

**الوظائف**:
- يولد SECRET_KEY عشوائي قوي (43 حرف)
- مناسب للإنتاج
- يعطي تعليمات الأمان

**مثال الإخراج**:
```
SECRET_KEY=1bSvmYStqJtNgvSf_yiNyRJjaey87PyPC4kmJImxrIg
```

### 4. test_endpoints.sh (Bash)
**الوصف**: يختبر جميع الـ endpoints المطلوبة على الخادم

**الاستخدام**:
```bash
bash scripts/test_endpoints.sh [domain]
```

**مثال**:
```bash
bash scripts/test_endpoints.sh piledger.app
```

**الوظائف**:
- يختبر Domain Verification endpoint
- يختبر Manifest endpoint
- يختبر Privacy Policy و Terms of Service
- يختبر Health Checks
- يتحقق من Security Headers
- يعطي تقرير مفصل

### 5. test_endpoints.ps1 (PowerShell)
**الوصف**: نفس وظيفة test_endpoints.sh لكن لـ Windows PowerShell

**الاستخدام**:
```powershell
.\scripts\test_endpoints.ps1 [domain]
```

**مثال**:
```powershell
.\scripts\test_endpoints.ps1 piledger.app
```

## ترتيب الاستخدام

### قبل النشر
1. **تحقق من الملفات المحلية**:
   ```bash
   python scripts/verify_local_setup.py
   ```

2. **تحقق من الجاهزية**:
   ```bash
   python scripts/check_submission_readiness.py
   ```

3. **ولّد SECRET_KEY**:
   ```bash
   python scripts/generate_secret_key.py
   ```

### بعد النشر
1. **اختبر الـ endpoints**:
   ```bash
   # Unix/Linux/Mac
   bash scripts/test_endpoints.sh piledger.app
   
   # Windows
   powershell scripts/test_endpoints.ps1 piledger.app
   ```

2. **اختبر في Pi Browser** (يدوي)

3. **أكمل إعدادات Developer Portal** (يدوي)

## ملاحظات

- جميع السكريبتات تعمل على Python 3
- test_endpoints scripts تحتاج curl (Unix) أو Invoke-WebRequest (PowerShell)
- SECRET_KEY المولد يجب نسخه إلى ملف .env على الخادم
- لا ترفع ملف .env إلى Git

## المساعدة

للمزيد من المعلومات، راجع:
- `PRE_SUBMISSION_TASKS.md`: دليل شامل للمهام المتبقية
- `SUBMISSION_STATUS.md`: تقرير حالة شامل
- `COMPLETED_TASKS.md`: ملخص المهام المكتملة

