import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/* ════════════════════════════════════════════════════════════════════════════
   PDF/HTML EXPORT API
   Generates a beautiful Arabic HTML report with print-friendly CSS.
   In production, puppeteer/playwright would convert this to real PDF.
   ════════════════════════════════════════════════════════════════════════════ */

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: "حرج", color: "#dc2626" },
  HIGH: { label: "مرتفع", color: "#f97316" },
  MEDIUM: { label: "متوسط", color: "#eab308" },
  LOW: { label: "منخفض", color: "#0ea5e9" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "#dc2626" },
  in_progress: { label: "قيد التنفيذ", color: "#f97316" },
  fixed: { label: "تم الإصلاح", color: "#16a34a" },
  wont_fix: { label: "لن يُصلح", color: "#6b7280" },
  accepted_risk: { label: "مخاطر مقبولة", color: "#8b5cf6" },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters } = body as { filters?: Record<string, string> };

    const where: Record<string, unknown> = {};
    if (filters?.severity && filters.severity !== "ALL") {
      where.severity = filters.severity;
    }
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.source && filters.source !== "ALL") {
      where.source = filters.source;
    }

    const issues = await db.auditIssue.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { priority: "asc" },
    });

    // Count by severity
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const issue of issues) {
      const s = issue.severity as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const filterDesc: string[] = [];
    if (filters?.severity && filters.severity !== "ALL")
      filterDesc.push(`الخطورة: ${SEVERITY_MAP[filters.severity]?.label ?? filters.severity}`);
    if (filters?.status && filters.status !== "ALL")
      filterDesc.push(`الحالة: ${STATUS_MAP[filters.status]?.label ?? filters.status}`);
    if (filters?.source && filters.source !== "ALL")
      filterDesc.push(`المصدر: ${filters.source}`);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تقرير التدقيق الأمني — Ledgererp</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Cairo', sans-serif;
    background: #f8fafc;
    color: #1e293b;
    line-height: 1.7;
    direction: rtl;
  }

  @media print {
    body { background: white; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }

  .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

  .header {
    background: linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #6d28d9 100%);
    color: white;
    padding: 32px;
    border-radius: 16px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }

  .header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
  }

  .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; position: relative; }
  .header .subtitle { font-size: 13px; opacity: 0.8; position: relative; }
  .header .date { font-size: 12px; opacity: 0.6; margin-top: 12px; position: relative; }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  .stat-card .number { font-size: 28px; font-weight: 800; }
  .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }

  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #7c3aed;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .issue-row {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 10px;
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 14px;
    align-items: center;
    transition: box-shadow 0.2s;
  }

  .issue-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

  .issue-id {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #7c3aed;
    background: #f5f3ff;
    padding: 3px 10px;
    border-radius: 6px;
    white-space: nowrap;
  }

  .issue-title { font-size: 13px; font-weight: 600; }
  .issue-meta { font-size: 11px; color: #64748b; margin-top: 2px; }

  .badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .badge-critical { background: #fef2f2; color: #dc2626; }
  .badge-high { background: #fff7ed; color: #ea580c; }
  .badge-medium { background: #fefce8; color: #ca8a04; }
  .badge-low { background: #f0f9ff; color: #0284c7; }

  .badge-open { background: #fef2f2; color: #dc2626; }
  .badge-in_progress { background: #fff7ed; color: #ea580c; }
  .badge-fixed { background: #f0fdf4; color: #16a34a; }
  .badge-wont_fix { background: #f9fafb; color: #6b7280; }
  .badge-accepted_risk { background: #faf5ff; color: #7c3aed; }

  .footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
  }

  .print-btn {
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: linear-gradient(135deg, #581c87, #7c3aed);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
  }

  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    .issue-row { grid-template-columns: 1fr; gap: 8px; }
  }
</style>
</head>
<body>

<div class="container">
  <!-- Header -->
  <div class="header">
    <h1>🛡️ تقرير التدقيق الأمني — Ledgererp</h1>
    <div class="subtitle">Pi Network — Security Audit Report</div>
    <div class="date">${dateStr}</div>
    ${filterDesc.length > 0 ? `<div style="font-size:12px;opacity:0.7;margin-top:8px;">الفلاتر: ${filterDesc.join(" | ")}</div>` : ""}
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat-card">
      <div class="number" style="color:#1e293b">${issues.length}</div>
      <div class="label">إجمالي المشاكل</div>
    </div>
    <div class="stat-card">
      <div class="number" style="color:#dc2626">${counts.CRITICAL}</div>
      <div class="label">حرج</div>
    </div>
    <div class="stat-card">
      <div class="number" style="color:#ea580c">${counts.HIGH}</div>
      <div class="label">مرتفع</div>
    </div>
    <div class="stat-card">
      <div class="number" style="color:#ca8a04">${counts.MEDIUM + counts.LOW}</div>
      <div class="label">متوسط + منخفض</div>
    </div>
  </div>

  <!-- Issues List -->
  <div class="section">
    <div class="section-title">📋 قائمة المشاكل</div>
    ${issues
      .map(
        (issue) => `
    <div class="issue-row">
      <div class="issue-id">${issue.issueId}</div>
      <div>
        <div class="issue-title">${issue.title}</div>
        <div class="issue-meta">${issue.file}${issue.line ? `:${issue.line}` : ""} — ${issue.category}</div>
      </div>
      <span class="badge badge-${issue.severity.toLowerCase()}">${SEVERITY_MAP[issue.severity]?.label ?? issue.severity}</span>
      <span class="badge badge-${issue.status}">${STATUS_MAP[issue.status]?.label ?? issue.status}</span>
    </div>`
      )
      .join("")}
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>تم الإنشاء بتقنية Pi Network — Ledgererp Security Audit Dashboard</p>
    <p style="margin-top:4px">${issues.length} مشكلة — ${dateStr}</p>
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>

</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="audit-report-${now.toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF export failed:", error);
    return NextResponse.json(
      { error: "فشل في إنشاء التقرير" },
      { status: 500 }
    );
  }
}