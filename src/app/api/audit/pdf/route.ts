import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/audit`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch audit data" }, { status: 500 });
    }
    const data = await res.json();

    const html = buildPdfHtml(data);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ledgererp-audit-report.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}

function buildPdfHtml(data: Record<string, unknown>) {
  const d = data as Record<string, unknown>;

  const summary = d.summary || {};
  const scores = d.scores || {};
  const meta = d.meta || {};
  const criticalFindings = (d.criticalFindings || []).slice(0, 10);
  const recommendations = (d.recommendations || []).slice(0, 10);
  const piCompliance = d.piNetworkCompliance || {};

  const auditDate = meta.auditDate
    ? new Date(meta.auditDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";

  const scoreColor = (s: number) => s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : s >= 40 ? "#f97316" : "#ef4444";
  const severityColor = (s: string) => s === "CRITICAL" ? "#ef4444" : s === "HIGH" ? "#f97316" : s === "MEDIUM" ? "#f59e0b" : "#3b82f6";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Security Audit Report - ${meta.projectName || "Unknown"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6; padding: 48px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
  h2 { font-size: 18px; font-weight: 700; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; }
  h3 { font-size: 14px; font-weight: 700; margin: 16px 0 8px; color: #334155; }
  .subtitle { font-size: 13px; color: #64748b; margin-bottom: 32px; }
  .verdict { background: linear-gradient(135deg, #dc2626, #e11d48); color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 32px; }
  .verdict h2 { color: white; border-bottom-color: rgba(255,255,255,0.3); margin-top: 0; }
  .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0 32px; }
  .score-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
  .score-value { font-size: 32px; font-weight: 900; }
  .score-label { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 32px; }
  .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 800; }
  .stat-label { font-size: 10px; color: #64748b; margin-top: 2px; font-weight: 600; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th { background: #f8fafc; text-align: left; padding: 10px 12px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  code { font-family: 'SF Mono', 'Fira Code', monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .meta-row { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
  .meta-item { font-size: 12px; color: #64748b; }
  .meta-item strong { color: #334155; }
  .compliance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .compliance-item { text-align: center; padding: 10px 8px; border: 1px solid #e2e8f0; border-radius: 8px; }
  .compliance-value { font-size: 20px; font-weight: 800; }
  .compliance-label { font-size: 9px; color: #64748b; margin-top: 2px; font-weight: 600; text-transform: uppercase; }
  .rec-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 12px; }
  .rec-num { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .page-break { page-break-before: always; }
  @media print { body { padding: 24px; } .page-break { page-break-before: always; } }
</style>
</head>
<body>

<h1>Security Audit Report</h1>
<p class="subtitle">${meta.projectName || "Unknown"} &bull; ${auditDate} &bull; ${meta.repository || ""}</p>

<div class="meta-row">
  <div class="meta-item"><strong>Repository:</strong> ${meta.repository || "N/A"}</div>
  <div class="meta-item"><strong>Files Analyzed:</strong> ${meta.totalFiles || "N/A"}</div>
  <div class="meta-item"><strong>Lines of Code:</strong> ${meta.totalLines || "N/A"}</div>
  <div class="meta-item"><strong>Tech Stack:</strong> ${(meta.techStack || []).join(", ")}</div>
</div>

<div class="verdict">
  <h2>REJECTED - NOT READY FOR DEPLOYMENT</h2>
  <p style="font-size: 13px; margin-top: 8px; opacity: 0.9;">Overall Score: <strong>${scores.overall || 0}/100</strong> &mdash; ${summary.critical || 0} critical vulnerabilities, ${summary.blockingDeployment || 0} blocking issues</p>
</div>

<h2>Executive Summary</h2>
<p style="font-size: 12px; color: #475569; margin-bottom: 8px;">
  ${meta.description || "No description available."}
</p>
<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 12px 0;">
  <p style="font-size: 12px; color: #991b1b;"><strong>Risk Level: CRITICAL</strong> &mdash; Multiple authentication bypasses and hardcoded secrets expose all user data. The system is fundamentally custodial despite claiming non-custodial architecture.</p>
</div>

<h2>Quality Scores</h2>
<div class="score-grid">
  <div class="score-card">
    <div class="score-value" style="color: ${scoreColor(scores.overall || 0)}">${scores.overall || 0}</div>
    <div class="score-label">Overall</div>
  </div>
  <div class="score-card">
    <div class="score-value" style="color: ${scoreColor(scores.backend?.overall || 0)}">${scores.backend?.overall || 0}</div>
    <div class="score-label">Backend</div>
  </div>
  <div class="score-card">
    <div class="score-value" style="color: ${scoreColor(scores.frontend?.overall || 0)}">${scores.frontend?.overall || 0}</div>
    <div class="score-label">Frontend</div>
  </div>
</div>

<h2>Severity Breakdown</h2>
<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-value" style="color: #ef4444">${summary.critical || 0}</div>
    <div class="stat-label">Critical</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f97316">${summary.high || 0}</div>
    <div class="stat-label">High</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #f59e0b">${summary.medium || 0}</div>
    <div class="stat-label">Medium</div>
  </div>
  <div class="stat-card">
    <div class="stat-value" style="color: #3b82f6">${summary.low || 0}</div>
    <div class="stat-label">Low</div>
  </div>
</div>

<div class="page-break"></div>

<h2>Pi Network Compliance</h2>
<div class="compliance-grid">
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.manifestCompliance || 0)}">${scores.piNetwork?.manifestCompliance || 0}</div>
    <div class="compliance-label">Manifest</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.domainVerification || 0)}">${scores.piNetwork?.domainVerification || 0}</div>
    <div class="compliance-label">Domain Verify</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.apiKeyManagement || 0)}">${scores.piNetwork?.apiKeyManagement || 0}</div>
    <div class="compliance-label">API Keys</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.paymentFlow || 0)}">${scores.piNetwork?.paymentFlow || 0}</div>
    <div class="compliance-label">Payment Flow</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.kycKyb || 0)}">${scores.piNetwork?.kycKyb || 0}</div>
    <div class="compliance-label">KYC/KYB</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.deploymentReadiness || 0)}">${scores.piNetwork?.deploymentReadiness || 0}</div>
    <div class="compliance-label">Deployment</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.nonCustodial || 0)}">${scores.piNetwork?.nonCustodial || 0}</div>
    <div class="compliance-label">Non-Custodial</div>
  </div>
  <div class="compliance-item">
    <div class="compliance-value" style="color: ${scoreColor(scores.piNetwork?.overall || 0)}">${scores.piNetwork?.overall || 0}</div>
    <div class="compliance-label">Overall</div>
  </div>
</div>

<h2>Critical Findings (Top ${criticalFindings.length})</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Category</th>
      <th>File</th>
      <th>Issue</th>
    </tr>
  </thead>
  <tbody>
    ${criticalFindings.map((f: Record<string, unknown>, i: number) => `
    <tr>
      <td style="font-weight: 700; color: #ef4444;">${i + 1}</td>
      <td>${f.category || ""}</td>
      <td><code>${f.file || ""}</code></td>
      <td style="font-weight: 500;">${f.title || ""}</td>
    </tr>`).join("")}
  </tbody>
</table>

<h2>Top Recommendations</h2>
<div style="font-size: 12px;">
  ${recommendations.map((r: Record<string, unknown>, i: number) => `
  <div class="rec-item">
    <div class="rec-num" style="background: ${r.impact === "Critical" ? "#ef4444" : r.impact === "High" ? "#f97316" : "#f59e0b"}">${i + 1}</div>
    <span style="flex: 1;">${r.title || ""}</span>
    <span class="badge" style="background: ${r.effort === "Small" ? "#dcfce7" : r.effort === "Medium" ? "#fef9c3" : "#fee2e2"}; color: ${r.effort === "Small" ? "#166534" : r.effort === "Medium" ? "#854d0e" : "#991b1b"};">${r.effort || ""}</span>
  </div>`).join("")}
</div>

<div class="footer">
  <p>Generated by Security Audit Dashboard &bull; ${auditDate} &bull; ${meta.totalFiles || 0} files &bull; ${meta.totalLines || 0} lines &bull; ${summary.totalIssues || 0} issues found</p>
</div>

</body>
</html>`;
}