import { NextRequest, NextResponse } from "next/server";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Notification {
  id: string;
  type: "security_alert" | "fix_confirmed" | "ai_insight" | "pi_payment" | "system_update";
  title: string;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

/* ── Mock Notifications ────────────────────────────────────────────── */

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    type: "security_alert",
    title: "ثغرة XSS جديدة مكتشفة",
    message: "تم اكتشاف ثغرة XSS في ملف auth/login.ts السطر 45 — إدخال مستخدم غير منقّح يُمرر مباشرة إلى innerHTML",
    severity: "CRITICAL",
    read: false,
    createdAt: "2025-01-15T10:30:00Z",
    actionUrl: "/issues/SEC-042",
  },
  {
    id: "notif-2",
    type: "fix_confirmed",
    title: "تم تأكيد إصلاح مشكلة CSRF",
    message: "تم التحقق من إصلاح مشكلة CSRF في نقطة النهاية /api/transfer بنجاح — تم إضافة رمز CSRF token",
    severity: "INFO",
    read: false,
    createdAt: "2025-01-15T09:15:00Z",
    actionUrl: "/issues/SEC-038",
  },
  {
    id: "notif-3",
    type: "ai_insight",
    title: "تحليل الذكاء الاصطناعي: نمط خبيث جديد",
    message: "اكتشف المستشار الذكي نمطاً متكرراً لاستخدام eval() في 5 ملفات — يُوصى بمراجعة فورية",
    severity: "HIGH",
    read: false,
    createdAt: "2025-01-15T08:45:00Z",
  },
  {
    id: "notif-4",
    type: "pi_payment",
    title: "دفعة Pi Network مكتملة",
    message: "تم استلام 50 Pi كمكافأة عن إصلاح 3 ثغرات حرجة — المعاملة #TXN-8842",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-14T16:20:00Z",
  },
  {
    id: "notif-5",
    type: "system_update",
    title: "تحديث النظام V5 متاح",
    message: "تم إصدار تحديث جديد يتضمن ماسح أمني بالذكاء الاصطناعي ولوحة متصدرين محسّنة",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-14T14:00:00Z",
  },
  {
    id: "notif-6",
    type: "security_alert",
    title: "تصعيد صلاحيات في Pi KYC",
    message: "تم اكتشاف مسار تصعيد صلاحيات في وحدة التحقق من الهوية — يمكن للمستخدم تجاوز مستوى KYC",
    severity: "CRITICAL",
    read: false,
    createdAt: "2025-01-14T12:30:00Z",
    actionUrl: "/issues/SEC-040",
  },
  {
    id: "notif-7",
    type: "ai_insight",
    title: "توصية: تحسين تشفير كلمات المرور",
    message: "بناءً على التحليل، يُنصح بالترقية من bcrypt rounds=8 إلى rounds=12 لحماية أفضل",
    severity: "MEDIUM",
    read: true,
    createdAt: "2025-01-14T10:00:00Z",
  },
  {
    id: "notif-8",
    type: "fix_confirmed",
    title: "إصلاح حقن SQL مؤكد",
    message: "تم التحقق من إصلاح مشكلة حقن SQL في استعلام البحث — تم استخدام معلمات مُجهزة",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-13T17:45:00Z",
    actionUrl: "/issues/SEC-035",
  },
  {
    id: "notif-9",
    type: "security_alert",
    title: "تسريب بيانات حساسة",
    message: "تم الكشف عن تسريب بيانات في واجهة برمجية REST — بيانات المستخدمين تُعرض بدون تصفية",
    severity: "HIGH",
    read: false,
    createdAt: "2025-01-13T15:20:00Z",
    actionUrl: "/issues/SEC-039",
  },
  {
    id: "notif-10",
    type: "pi_payment",
    title: "مكافأة أسبوعية Pi",
    message: "حصلت على مكافأة 25 Pi كجزء من برنامج مكافآت المدققين الأمنيين الأسبوعي",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-13T09:00:00Z",
  },
  {
    id: "notif-11",
    type: "system_update",
    title: "صيانة مجدولة",
    message: "سيتم إجراء صيانة على قاعدة البيانات يوم 16 يناير الساعة 02:00 بتوقيت UTC — قد يتأثر الأداء مؤقتاً",
    severity: "LOW",
    read: true,
    createdAt: "2025-01-12T18:00:00Z",
  },
  {
    id: "notif-12",
    type: "ai_insight",
    title: "تحليل: اتجاه الأمان هذا الأسبوع",
    message: "انخفض عدد الثغرات الجديدة بنسبة 15% مقارنة بالأسبوع الماضي — لكن الثغرات الحرجة زادت بنسبة 8%",
    severity: "MEDIUM",
    read: true,
    createdAt: "2025-01-12T11:30:00Z",
  },
  {
    id: "notif-13",
    type: "security_alert",
    title: "هجوم محتمل على محفظة Pi",
    message: "تم رصد محاولات وصول مشبوهة إلى نقطة نهاية محفظة Pi — تم حظر 3 عناوين IP",
    severity: "HIGH",
    read: false,
    createdAt: "2025-01-12T08:15:00Z",
    actionUrl: "/issues/SEC-041",
  },
  {
    id: "notif-14",
    type: "fix_confirmed",
    title: "إصلاح مشكلة تخزين الرموز",
    message: "تم التحقق من نقل تخزين الرموز المميزة من localStorage إلى httpOnly cookies",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-11T16:30:00Z",
    actionUrl: "/issues/SEC-033",
  },
  {
    id: "notif-15",
    type: "pi_payment",
    title: "تحويل Pi ناجح",
    message: "تم تحويل 100 Pi إلى محفظة خارجية بنجاح — المعاملة #TXN-8839",
    severity: "INFO",
    read: true,
    createdAt: "2025-01-11T14:00:00Z",
  },
];

/* ── In-memory read state ──────────────────────────────────────────── */

const readState = new Map<string, boolean>();
// Initialize from mock data
for (const n of MOCK_NOTIFICATIONS) {
  readState.set(n.id, n.read);
}

/* ── GET ───────────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const notifications = MOCK_NOTIFICATIONS.map((n) => ({
      ...n,
      read: readState.get(n.id) ?? n.read,
    }));

    // Sort by createdAt descending
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل الإشعارات" },
      { status: 500 }
    );
  }
}

/* ── POST ──────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body as { id?: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "معرف الإشعار مطلوب" },
        { status: 400 }
      );
    }

    if (!readState.has(id)) {
      return NextResponse.json(
        { error: "الإشعار غير موجود" },
        { status: 404 }
      );
    }

    readState.set(id, true);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "فشل في تحديث حالة الإشعار" },
      { status: 500 }
    );
  }
}