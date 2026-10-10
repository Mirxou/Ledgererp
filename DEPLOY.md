# 🚀 Ledgererp — دليل النشر والإنتاج

## دليل شامل لتثبيت وتشغيل النظام على جهاز المتجر الفعلي

---

## 📋 المتطلبات الأساسية

| المتطلب | الحد الأدنى | الموصى به |
|---------|-------------|-----------|
| نظام التشغيل | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |
| Docker | 20.10+ | 24.x |
| Docker Compose | 2.0+ | 2.20+ |
| RAM | 2 GB | 4 GB |
| مساحة القرص | 5 GB | 20 GB |
| المعالج | 2 cores | 4 cores |

---

## ⚡ التثبيت السريع (أمر واحد)

```bash
# 1. استنساخ المشروع
git clone https://github.com/Mirxou/Ledgererp.git
cd Ledgererp

# 2. تشغيل سكريبت التثبيت
chmod +x deploy.sh
./deploy.sh install
```

هذا سيقوم تلقائياً بـ:
- ✅ التحقق من Docker و Docker Compose
- ✅ إنشاء ملف `.env` من القالب
- ✅ بناء الصورة
- ✅ تشغيل الحاويات
- ✅ فحص الصحة (Health Check)

---

## 🔧 التثبيت اليدوي (خطوة بخطوة)

### 1. إعداد البيئة

```bash
# نسخ ملف البيئة
cp .env.example .env

# تحرير الإعدادات
nano .env
```

#### إعدادات مطلوبة للإنتاج:

```env
# ─── وضع الإنتاج ───
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_DEMO_MODE=false   # ⚠️ غيّر إلى false في الإنتاج!

# ─── Pi Network API (مطلوب للدفع الرقمي) ───
PI_API_KEY=your_production_api_key
PI_WALLET_ADDRESS=your_wallet_address
PI_APP_ID=your_app_id
PI_APP_SECRET=your_app_secret

# ─── إعدادات المتجر ───
STORE_DEFAULT_CURRENCY=Pi
STORE_TAX_RATE=19    # نسبة الضريبة (مثلاً 19% للجزائر)
```

### 2. بناء وتشغيل الحاويات

```bash
# بناء الصورة
docker compose build

# تشغيل في الخلفية
docker compose up -d

# متابعة السجلات
docker compose logs -f
```

### 3. التحقق من التشغيل

```bash
# فحص حالة الحاويات
docker compose ps

# فحص صحة التطبيق
curl http://localhost:3000/api/health

# يجب أن ترى:
# {"status":"healthy","services":{"database":"connected"}}
```

---

## 🌐 الوصول للتطبيق

| الوصول | العنوان |
|--------|---------|
| نقطة البيع (POS) | `http://localhost:3000` |
| فحص الصحة | `http://localhost:3000/api/health` |
| فاتورة زبون | `http://localhost:3000/?invoice=INV-xxx` |
| متجر زبون | `http://localhost:3000/?store=store-slug` |

---

## 🔐 إعداد الأمان للإنتاج

### 1. تفعيل HTTPS (موصى به بشدة)

```bash
# تثبيت Certbot لـ Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com
```

### 2. إعداد جدار الحماية

```bash
# السماح فقط بالمنافذ المطلوبة
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 22/tcp     # SSH
sudo ufw enable
```

### 3. تأمين Docker

```bash
# لا تشغّل Docker كـ root — استخدم المستخدم nextjs داخل الحاوية
# (مُفعّل تلقائياً في Dockerfile)
```

---

## 📱 إعداد نقطة البيع (POS) كـ PWA

### تثبيت كتطبيق على الجهاز اللوحي

1. افتح `http://localhost:3000` في Chrome/Edge
2. اضغط على أيقونة التثبيت في شريط العنوان
3. أو: القائمة → "تثبيت التطبيق"

### مزايا العمل بدون إنترنت:
- ✅ نقطة البيع تعمل بدون اتصال
- ✅ المبيعات تُحفظ محلياً وتُزامن عند عودة الاتصال
- ✅ بيانات المنتجات محفوظة في الذاكرة المؤقتة
- ✅ واجهة كاشير مُحسّنة للشاشات اللمسية

### وضع الكاشير:
- شاشة مبسّطة بدون بيانات مالية حساسة
- شبكة منتجات سريعة للبحث والاختيار
- دعم الطباعة على طابعة الحرارة (80mm) أو A4

---

## 🔄 إدارة النسخ الاحتياطي

### نسخ احتياطي تلقائي

النظام يحتفظ بـ **10 نسخ احتياطية** تلقائياً مع:
- ⏱️ فترة تبريد دقيقة واحدة بين النسخ
- 🛡️ نسخة أمان قبل كل استعادة
- 📊 تتبع الحجم والتاريخ

### أوامر النسخ الاحتياطي

```bash
# إنشاء نسخة احتياطية عبر API
curl http://localhost:3000/api/backup

# أو عبر سكريبت النشر
./deploy.sh backup

# قائمة النسخ الاحتياطية
curl http://localhost:3000/api/backup?list=true
```

### نسخ احتياطي يدوي (SQLite)

```bash
# نسخ ملف قاعدة البيانات مباشرة
cp db/ledgererp.db db/backups/manual_$(date +%Y%m%d_%H%M%S).db

# أو من داخل الحاوية
docker exec ledgererp-app cp /app/db/ledgererp.db /app/db/backups/manual.db
```

---

## 👥 إدارة الصلاحيات (RBAC)

| الدور | الصلاحيات |
|------|----------|
| **مدير** | كل شيء: لوحة التحكم، المنتجات، المخزون، المبيعات، الطلبات، الزبائن، المصروفات، المالية، المعاملات، الإعدادات |
| **كاشير** | نقطة البيع فقط: شبكة المنتجات، بناء سلة الشراء، إتمام البيع، إعادة الطباعة |

### التبديل بين الأدوار:
- اضغط على شارة الدور في أعلى الشاشة
- أكد التبديل في نافذة التأكيد
- الدور محفوظ في المتصفح (localStorage)

---

## 📊 أوامر الإدارة

```bash
# الحالة
./deploy.sh status

# إعادة التشغيل
./deploy.sh restart

# السجلات
./deploy.sh logs

# تحديث (سحب + بناء + إعادة تشغيل)
./deploy.sh update

# إيقاف
./deploy.sh stop
```

---

## 🔍 مراقبة الأداء

### فحص الصحة المستمر

```bash
# فحص كل 30 ثانية (مُفعّل في docker-compose.yml)
# فحص يدوي:
curl -s http://localhost:3000/api/health | jq

# النتيجة المتوقعة:
# {
#   "status": "healthy",
#   "timestamp": "2025-01-15T10:30:00.000Z",
#   "latency": "3ms",
#   "version": "2.0",
#   "services": {
#     "database": "connected",
#     "pi_integration": true
#   }
# }
```

### مراقبة الموارد

```bash
# استخدام الحاوية للموارد
docker stats ledgererp-app

# مساحة القرص
du -sh db/
du -sh db/backups/
```

---

## 🐛 حل المشاكل الشائعة

### الحاوية لا تبدأ

```bash
# تحقق من السجلات
docker compose logs

# تحقق من المنفذ 3000
lsof -i :3000

# أعد البناء من الصفر
docker compose down
docker compose build --no-cache
docker compose up -d
```

### خطأ في قاعدة البيانات

```bash
# تحقق من ملف SQLite
ls -la db/ledgererp.db

# استعادة من نسخة احتياطية
curl -X POST http://localhost:3000/api/backup \
  -H "Content-Type: application/json" \
  -d '{"action":"restore","filename":"backup_20250115.db"}'
```

### مشكلة في الأذونات

```bash
# إصلاح أذونات مجلد قاعدة البيانات
sudo chown -R 1001:1001 db/
sudo chown -R 1001:1001 db/backups/
```

---

## 📦 هيكل الملفات للإنتاج

```
Ledgererp/
├── .env                    # إعدادات البيئة (لا تُرفع لـ Git!)
├── .env.example            # قالب الإعدادات
├── Dockerfile              # بناء متعدد المراحل (Bun)
├── docker-compose.yml      # إعداد الإنتاج
├── docker-compose.dev.yml  # إعداد التطوير
├── deploy.sh               # سكريبت النشر
├── db/
│   ├── ledgererp.db        # قاعدة بيانات SQLite
│   └── backups/            # النسخ الاحتياطية (max 10)
├── public/
│   ├── sw.js               # Service Worker (العمل بدون إنترنت)
│   └── manifest.json       # PWA manifest
└── src/                    # كود التطبيق
```

---

## 🎯 قائمة التحقق قبل التشغيل التجاري

- [ ] Docker و Docker Compose مثبتان
- [ ] ملف `.env` مُعد بإعدادات الإنتاج
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` في .env
- [ ] مفاتيح Pi Network API مُعدة
- [ ] الحاويات تعمل (`./deploy.sh status`)
- [ ] فحص الصحة ناجح (`/api/health` → 200)
- [ ] النسخ الاحتياطي يعمل
- [ ] إنشاء المتجر واختبار نقطة البيع
- [ ] اختبار الطباعة على الطابعة الحرارية
- [ ] اختبار وضع الكاشير
- [ ] تثبيت PWA على جهاز نقطة البيع
- [ ] اختبار العمل بدون إنترنت
- [ ] إعداد HTTPS (موصى به)

---

## 📞 الدعم الفني

- **GitHub**: https://github.com/Mirxou/Ledgererp
- **الإصدار**: 2.0
- **التقنيات**: Next.js 16 + Bun + SQLite + Pi Network

---

*آخر تحديث: يناير 2025*
