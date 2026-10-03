import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/audit/pdf
 * Generates an HTML report of the escrow platform audit trail.
 * Uses REAL data from the database.
 */
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    if (!store) {
      return NextResponse.json({ error: "لم تنشئ متجراً بعد" }, { status: 404 });
    }

    const [auditLogs, invoices] = await Promise.all([
      db.auditLog.findMany({
        where: { userId: auth.user.uid },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.invoice.findMany({
        where: { storeId: store.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" });

    const statusCounts: Record<string, number> = {};
    for (const inv of invoices) {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    }

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>سجل التدقيق — ${store.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.7; direction: rtl; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
  h2 { font-size: 16px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #0d9488; }
  .header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
  .stat-card .number { font-size: 24px; font-weight: 800; }
  .stat-card .label { font-size: 11px; color: #64748b; margin-top: 4px; }
  .log-row { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  .print-btn { position: fixed; bottom: 24px; left: 24px; background: #0d9488; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>📋 سجل التدقيق — ${store.name}</h1>
  <div style="font-size:13px;opacity:0.8">Ledgererp — تقرير التدقيق والضمان</div>
  <div style="font-size:12px;opacity:0.6;margin-top:12px">${dateStr}</div>
</div>
<div class="stats">
  <div class="stat-card"><div class="number" style="color:#1e293b">${invoices.length}</div><div class="label">إجمالي الفواتير</div></div>
  <div class="stat-card"><div class="number" style="color:#16a34a">${statusCounts["completed"] || 0}</div><div class="label">مكتملة</div></div>
  <div class="stat-card"><div class="number" style="color:#dc2626">${statusCounts["disputed"] || 0}</div><div class="label">نزاعات</div></div>
  <div class="stat-card"><div class="number" style="color:#0d9488">${auditLogs.length}</div><div class="label">أحداث مسجلة</div></div>
</div>
<h2>سجل الأحداث</h2>
${auditLogs.map((log) => `
<div class="log-row">
  <div><strong>${log.action}</strong> ${log.details ? "— " + log.details : ""}</div>
  <div style="font-size:11px;color:#64748b">${new Date(log.createdAt).toLocaleString("ar-DZ")}</div>
</div>`).join("")}
<div class="footer">Ledgererp — ${dateStr} — ${auditLogs.length} حدث</div>
<button class="print-btn" onclick="window.print()">🖨️ طباعة</button>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="audit-${store.name}-${now.toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error("Audit PDF error:", error);
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
