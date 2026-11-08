# 🚀 دليل نشر Ledgererp على النطاق (VPS + HTTPS تلقائي)

هذا الدليل يشرح خطوة بخطوة كيف تنشر تطبيق **Ledgererp** على خادم خاص (VPS) مع نطاقك الخاص وشهادة HTTPS تلقائية — وهي متطلبات إلزامية لتشغيل تطبيقات Pi Network.

---

## 🅱️ المسار البديل: Vercel + Turso (بدون خادم — مجاني)

إذا لم يكن لديك VPS، نشر التطبيق على **Vercel** ممكن لكن **قاعدة البيانات المحلية SQLite لن تعمل** لأن Vercel بنظام ملفات للقراءة فقط (خطأ `Unable to open the database file`). الحل: قاعدة بيانات سحابية متوافقة مع SQLite من **Turso** (خطة مجانية).

> ⚠️ التطبيق مبرمج بحيث يتعرف تلقائياً على Turso عبر متغيرات البيئة — **لا حاجة لأي تعديل في الكود**، وسيُنشئ الجداول والبيانات التجريبية تلقائياً عند أول تشغيل.

### الخطوات:

1. **أنشئ قاعدة بيانات مجانية على Turso:**
   - سجّل الدخول على [app.turso.tech](https://app.turso.tech) بحساب GitHub
   - Databases → **Create database** → اختر اسماً مثل `ledgererp` وموقعاً قريباً (مثل `fra` أو `ams`)
   - انسخ **Database URL** (يبدأ بـ `libsql://`)

2. **أنشئ توكن لقاعدة البيانات:**
   - من صفحة القاعدة → Tokens → **Create token**
   - انسخ التوكن (سرّي — لا تشاركه)

3. **أضف المتغيرات في Vercel:**
   - مشروعك → Settings → **Environment Variables** → أضف:

   | المتغير | القيمة |
   |---------|--------|
   | `TURSO_DATABASE_URL` | `libsql://ledgererp-xxx.turso.io` |
   | `TURSO_AUTH_TOKEN` | التوكن الذي أنشأته |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` (ضع `true` مؤقتاً للتجربة السريعة في متصفح عادي) |
   | `PI_API_KEY` | مفتاحك من Pi Developer Portal |
   | `PI_WALLET_ADDRESS` | عنوان محفظتك |
   | `PI_APP_ID` / `PI_APP_SECRET` | من Developer Portal |

4. **أعد النشر:** Deployments → أحدث نشر → **Redeploy**

5. **تحقق:** افتح `https://نطاقك/api/health` — يجب أن ترى `"status":"healthy"`.
   عند أول طلب سينشئ التطبيق **جداول قاعدة البيانات تلقائياً** (17 جدول) + بيانات تجريبية إذا كان وضع demo مفعلاً.

### ملاحظات مهمة لنشر Vercel (دروس موثقة من النشر الفعلي 2026-11-08):

1. **🔴 الأهم — النطاق خلف Cloudflare يجب أن يكون DNS only (سحابة رمادية):**
   - إذا كان سجل النطاق "Proxied" (سحابة برتقالية) فإن Cloudflare يضيف تلقائياً ترويسة `X-Frame-Options: SAMEORIGIN` على كل استجابة
   - Pi Browser يعرض التطبيقات داخل إطار مدمج → تظهر `net::ERR_BLOCKED_BY_RESPONSE` ولا يفتح التطبيق إطلاقاً
   - **الحل**: DNS → Records → اضغط السجل الأساسي → حوّل السحابة من Proxied إلى **DNS only** → Save
   - بديل: احذف تطبيق "Security Headers" من قسم Apps، أو قاعدة Modify Response Header من Rules → Transform Rules
   - SSL يظل يعمل بعد ذلك من Vercel تلقائياً (شهادة صالحة تُصدر تلقائياً للنطاق)

2. **🔴 منطقة الوظائف (Function Region) يجب أن تطابق موقع قاعدة Turso:**
   - Settings → Functions → Function Region → اختر نفس منطقة قاعدة البيانات (مثلاً **Frankfurt fra1** مع قاعدة `aws-eu-central-1`)
   - الفرق هائل: زمن استجابة قاعدة البيانات انخفض من ~950ms إلى **7ms**

3. **🔴 ممنوع إضافة هذه الترويسات في الكود أو vercel.json (تكسر Pi Browser):**
   - `X-Frame-Options`، و`frame-ancestors` في CSP، و`Cross-Origin-Embedder-Policy`، و`Cross-Origin-Resource-Policy`
   - (تمت إزالتها من `vercel.json` و`next.config.ts` في commit `90e354c` — راجع ملاحظة الأمان أعلى `next.config.ts`)

4. **🔴 `NEXT_PUBLIC_PI_CLIENT_ID` إلزامي لتسجيل الدخول:**
   - بدون معرّف العميل من Developer Portal → Pi Sign-In لن يعمل داخل Pi Browser
   - تأكد أيضاً أن Redirect URI في Developer Portal يحتوي `https://نطاقك/`

5. **متفرقات:**
   - وضع SSL في Cloudflare: **Full** (وليس Flexible حتى لا يحدث حلقة تحويل) — لا يهم بعد DNS only
   - `NEXT_PUBLIC_*` تُثبّت وقت البناء — بعد تغييرها اضغط Redeploy دائماً
   - قبل مراجعة Pi Ad Network الرسمية: اجعل `NEXT_PUBLIC_DEMO_MODE=false` ليتم استخدام مصادقة Pi الحقيقية داخل Pi Browser
   - تحقق سريع بعد أي تغيير: `curl -I https://نطاقك/` — تأكد أنه لا توجد `x-frame-options` وأن `server: Vercel` (وليس cloudflare)

---

## 📋 المتطلبات (مسار VPS)

| المتطلب | التفاصيل |
|---------|----------|
| خادم VPS | Ubuntu 22.04+ — 2GB RAM كحد أدنى (مثل Hetzner / DigitalOcean / Contabo) |
| نطاق (Domain) | نطاقك الخاص مثل `erp.example.com` |
| Docker | الإصدار 24 أو أحدث مع إضافة Compose |
| مفاتيح Pi | PI_API_KEY من Pi Developer Portal |

---

## 1️⃣ ربط النطاق بالخادم (DNS)

من لوحة تحكم مزوّد النطاق، أضف سجل **A Record**:

```
النوع: A
الاسم: erp          (أو @ إذا أردت النطاق الرئيسي)
القيمة: IP_الخادم_الخاص_بك
TTL: 300
```

✅ تحقق من الانتشار قبل المتابعة:
```bash
ping erp.example.com
# يجب أن يظهر IP الخادم
```

> ⚠️ **مهم جداً:** لن تصدر شهادة HTTPS قبل أن يشير النطاق إلى الخادم بشكل صحيح.

---

## 2️⃣ تجهيز الخادم (مرة واحدة فقط)

اتصل بالخادم عبر SSH:
```bash
ssh root@IP_الخادم
```

ثبّت Docker:
```bash
curl -fsSL https://get.docker.com | sh
```

أنشئ مجلد التطبيق وثبّت Git إن لم يكن موجوداً:
```bash
apt update && apt install -y git
mkdir -p /opt && cd /opt
```

---

## 3️⃣ استنساخ المشروع من GitHub

```bash
git clone https://github.com/Mirxou/Ledgererp.git
cd Ledgererp
```

> 💡 مستودع خاص؟ استخدم Personal Access Token:
> `git clone https://TOKEN@github.com/Mirxou/Ledgererp.git`

---

## 4️⃣ إعداد ملف البيئة `.env`

```bash
cp .env.example .env
nano .env
```

عدّل القيم التالية:

```env
# 🔴 إلزامي — نطاقك الحقيقي
DOMAIN=erp.example.com

# 🔴 إلزامي — مفاتيح Pi Network من Developer Portal
PI_API_KEY=مفتاحك_الحقيقي
PI_WALLET_ADDRESS=عنوان_محفظتك
PI_APP_ID=معرف_تطبيقك

# إعلانات Pi Ad Network (من Developer Portal → Ad Network → Create Ad Unit)
NEXT_PUBLIC_PI_CLIENT_ID=معرف_العميل
NEXT_PUBLIC_PI_BANNER_AD_ID=معرف_وحدة_البانر
NEXT_PUBLIC_PI_INTERSTITIAL_AD_ID=معرف_وحدة_الإعلان_البيني
NEXT_PUBLIC_PI_REWARDED_AD_ID=معرف_وحدة_الإعلان_المكافئ

# 🔴 الإنتاج — يجب أن يكون false
NEXT_PUBLIC_DEMO_MODE=false
```

احفظ الملف: `Ctrl+O` ثم `Enter` ثم `Ctrl+X`

---

## 5️⃣ النشر بأمر واحد 🎯

```bash
chmod +x deploy.sh
./deploy.sh
```

السكربت يقوم تلقائياً بـ:
1. ✅ بناء صورة التطبيق (Next.js standalone + Prisma)
2. ✅ إنشاء/تحديث قاعدة بيانات SQLite داخل volume دائم
3. ✅ تشغيل التطبيق + Caddy (شهادة HTTPS تلقائية من Let's Encrypt)
4. ✅ فحص صحة التطبيق

بعد دقيقة تقريباً سيكون تطبيقك متاحاً على:

```
https://erp.example.com  ✅
```

---

## 6️⃣ التحقق من سلامة النشر

```bash
# حالة الخدمات
docker compose ps

# سجلات التطبيق المباشرة
docker compose logs -f ledgererp

# سجلات Caddy (إصدار شهادة HTTPS)
docker compose logs -f caddy

# فحص سريع
curl -I https://erp.example.com
```

يجب أن ترى `HTTP/2 200` وشهادة صالحة.

---

## 7️⃣ توثيق النطاق في Pi Developer Portal 🔑

بعد نشر التطبيق، يجب توثيق ملكية النطاق داخل Pi Developer Portal حتى يعمل التطبيق داخل Pi Browser:

1. افتح **Pi Developer Portal** → تطبيقك → **Settings**
2. تأكد أن **App URL** يطابق نطاقك: `https://erp.example.com`
3. اضغط **Validate Domain** واختر إحدى الطريقتين:
   - **HTML file**: حمّل ملف التوثيق الذي يمنحك إياه Pi، ثم ضعه في مجلد `public/` بالمشروع على الخادم وأعد التشغيل:
     ```bash
     # مثال — استبدل باسم الملف الفعلي من Pi
     nano public/validation-file.html   # الصق محتوى الملف
     docker compose restart ledgererp
     ```
   - **Meta tag**: أضف الوسم في `src/app/layout.tsx` داخل `<head>` ثم أعد البناء والنشر.
4. بعد التوثيق، اختبر التطبيق من **Pi Browser** على هاتفك.

---

## 8️⃣ تشغيل إعلانات Pi Ad Network على النطاق 📺

الإعلانات **لن تُعرض** إلا بعد استيفاء الشروط التالية:

- [ ] التطبيق يعمل على نطاق موثّق فوق ☝️
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` في `.env`
- [ ] معرّفات وحدات الإعلانات الحقيقية في `.env` (وليس القيم التجريبية)
- [ ] التطبيق مفتوح من داخل **Pi Browser** (الإعلانات لا تعمل في متصفح عادي — تظهر رسالة تلفّ ذلك بأمان)

ثم قدّم طلب **Pi Ad Network** من Developer Portal — الكود جاهز بالكامل في المستودع:
- `src/lib/pi-ads.ts` — محرك الإعلانات (Banner / Interstitial / Rewarded)
- `src/components/pi-ads.tsx` — مكوّنات الواجهة

---

## 🔄 التحديث بعد تعديل الكود

```bash
cd /opt/Ledgererp
git pull
./deploy.sh    # يعيد البناء والتشغيل — البيانات محفوظة في volume
```

---

## 💾 النسخ الاحتياطي

```bash
chmod +x backup.sh
./backup.sh     # نسخة مضغوطة في db/backups/

# نسخ احتياطي يومي تلقائي (الساعة 3 صباحاً):
crontab -e
# أضف السطر:
0 3 * * * cd /opt/Ledgererp && ./backup.sh >> /var/log/ledgererp-backup.log 2>&1
```

لاستعادة نسخة احتياطية:
```bash
gunzip -c db/backups/ledgererp_YYYYMMDD_HHMMSS.db.gz > /tmp/restore.db
docker cp /tmp/restore.db ledgererp-app:/app/db/ledgererp.db
docker compose restart ledgererp
```

---

## 🧯 حل المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| الشهادة لا تصدر | انتظر دقيقتين، تأكد من سجل DNS وفتح المنفذين 80 و443: `ufw allow 80,443/tcp` |
| التطبيق يظهر unhealthy | `docker compose logs ledgererp` — غالباً متغير ناقص في `.env` |
| 502 Bad Gateway | التطبيق لم يصبح جاهزاً بعد — انتظر 30 ثانية ثم أعد المحاولة |
| بيانات اختفت بعد إعادة النشر | تأكد أنك لم تحذف volume: `docker volume ls` يجب أن يظهر `ledgererp-db` |
| نسيان كلمة مرور قاعدة البيانات | SQLite لا يحتاج كلمة مرور — البيانات في ملف واحد داخل volume |
| أريد تحديث إعدادات `.env` | عدّل الملف ثم: `docker compose up -d --force-recreate ledgererp` |

---

## 🗺️ ملخص معماري

```
الإنترنت
   │  (80/443)
   ▼
┌─────────┐   HTTPS تلقائي   ┌──────────────────┐
│  Caddy  │ ───────────────▶ │  ledgererp-app   │
│ (proxy) │                  │  Next.js+Bun     │
└─────────┘                  │  :3000 (داخلي)   │
     │                       └────────┬─────────┘
     │ شهادات Let's Encrypt            │
     ▼                                 ▼
┌──────────┐                  ┌──────────────┐
│ caddy-data│                 │ ledgererp-db │  ← بياناتك محفوظة هنا
└──────────┘                  │  (SQLite)    │
                              └──────────────┘
```

---

## ✅ قائمة تحقق نهائية قبل إطلاق الحقيقي

- [ ] سجل DNS يشير للخادم
- [ ] `DOMAIN` مضبوط في `.env`
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] `PI_API_KEY` الجديد (بعد إبطال المفتاح القديم المكشوف)
- [ ] `./deploy.sh` نجح و`curl -I` يعيد 200
- [ ] النطاق موثّق في Pi Developer Portal
- [ ] التطبيق يفتح داخل Pi Browser ويصرف دفعة تجريبية sandbox
- [ ] `backup.sh` مجدول في crontab
- [ ] PAT الخاص بـ GitHub **مُبطَل** وتم إنشاء بديل جديد (لأن القديم كُشف في المحادثة)

---
© Ledgererp — نظام ERP للجملة والتجزئة على شبكة Pi Network
