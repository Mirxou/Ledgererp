import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/export/pdf
 * Generates an Arabic HTML report for the escrow platform.
 * Exports REAL data from the database — invoices, products, store info.
 */

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الدفع", color: "#6b7280" },
  paid_escrow: { label: "مدفوع في الضمان", color: "#2563eb" },
  shipped: { label: "تم الشحن", color: "#7c3aed" },
  delivered: { label: "تم التسليم", color: "#0d9488" },
  completed: { label: "مكتمل", color: "#16a34a" },
  disputed: { label: "نزاع", color: "#dc2626" },
  cancelled: { label: "ملغى", color: "#6b7280" },
};

export async function POST(request: NextRequest) {
  const rateLimitErr = checkRateLimit(request);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(request);
    if (!auth.ok) return auth.response;

    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    if (!store) {
      return NextResponse.json({ error: "لم تنشئ متجراً بعد" }, { status: 404 });
    }

    // Fetch all store data for the report
    const [invoices, products] = await Promise.all([
      db.invoice.findMany({
        where: { storeId: store.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      db.product.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Compute stats
    const statusCounts: Record<string, number> = {};
    for (const inv of invoices) {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    }
    const totalEscrowed = invoices
      .filter((i) => ["paid_escrow", "shipped", "delivered"].includes(i.status))
      .reduce((s, i) => s + i.total, 0);
    const totalCompleted = invoices
      .filter((i) => i.status === "completed")
      .reduce((s, i) => s + i.subtotal, 0);

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تقرير المتجر — ${store.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.7; direction: rtl; }
  @media print { body { background: white; } .no-print { display: none !important; } }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  .header { background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #14b8a6 100%); color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px; }
  .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
  .header .subtitle { font-size: 13px; opacity: 0.8; }
  .header .date { font-size: 12px; opacity: 0.6; margin-top: 12px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .stat-card .number { font-size: 28px; font-weight: 800; }
  .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #0d9488; }
  .invoice-row { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; }
  .badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; display: inline-block; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  .print-btn { position: fixed; bottom: 24px; left: 24px; background: linear-gradient(135deg, #059669, #0d9488); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(13,148,136,0.4); }
  @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🏪 تقرير المتجر — ${store.name}</h1>
    <div class="subtitle">Ledgererp — تقرير الفواتير والضمان</div>
    <div class="date">${dateStr}</div>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="number" style="color:#1e293b">${invoices.length}</div><div class="label">إجمالي الفواتير</div></div>
    <div class="stat-card"><div class="number" style="color:#16a34a">${statusCounts["completed"] || 0}</div><div class="label">مكتملة</div></div>
    <div class="stat-card"><div class="number" style="color:#2563eb">${totalEscrowed.toFixed(2)}π</div><div class="label">في الضمان</div></div>
    <div class="stat-card"><div class="number" style="color:#059669">${totalCompleted.toFixed(2)}π</div><div class="label">مكتمل</div></div>
  </div>
  <div class="section">
    <div class="section-title">📋 قائمة الفواتير</div>
    ${invoices.map((inv) => `
    <div class="invoice-row">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${inv.invoiceNumber}</strong> — ${inv.customerName || inv.customerPiUid}
          <div style="font-size:11px;color:#64748b;margin-top:2px">${inv.items.map((i) => i.productName + " x" + i.quantity).join(", ")}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge" style="background:${(STATUS_MAP[inv.status]?.color || '#6b7280')}20;color:${STATUS_MAP[inv.status]?.color || '#6b7280'}">${STATUS_MAP[inv.status]?.label || inv.status}</span>
          <strong style="color:#059669">${inv.total}π</strong>
        </div>
      </div>
    </div>`).join("")}
  </div>
  <div class="footer">
    <p>Ledgererp — منصة الفواتير والضمان الآمن</p>
    <p style="margin-top:4px">${invoices.length} فاتورة — ${products.length} منتج — ${dateStr}</p>
  </div>
</div>
<button class="print-btn no-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="store-report-${store.name}-${now.toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF export failed:", error);
    return NextResponse.json({ error: "فشل في إنشاء التقرير" }, { status: 500 });
  }
}
