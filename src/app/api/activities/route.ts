import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Activity {
  id: string;
  type: "issue_fixed" | "issue_status_changed" | "ai_analysis" | "login" | "export";
  description: string;
  timestamp: string;
  issueId?: string;
  severity?: string;
}

/* ── GET Handler ───────────────────────────────────────────────────────── */

export async function GET() {
  try {
    /* ── Fetch recent audit logs ────────────────────────────────── */
    const recentLogs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        issue: {
          select: {
            severity: true,
            title: true,
          },
        },
      },
    });

    /* ── Fetch recent fixed issues ──────────────────────────────── */
    const recentFixed = await db.auditIssue.findMany({
      where: { status: "FIXED", fixedAt: { not: null } },
      orderBy: { fixedAt: "desc" },
      take: 30,
      select: {
        issueId: true,
        severity: true,
        title: true,
        category: true,
        fixedAt: true,
      },
    });

    /* ── Map to activities ──────────────────────────────────────── */
    const activities: Activity[] = [];

    // Fixed issues
    for (const issue of recentFixed) {
      if (issue.fixedAt) {
        activities.push({
          id: `fixed-${issue.issueId}`,
          type: "issue_fixed",
          description: `تم إصلاح: ${issue.title}`,
          timestamp: issue.fixedAt.toISOString(),
          issueId: issue.issueId,
          severity: issue.severity,
        });
      }
    }

    // Audit logs
    for (const log of recentLogs) {
      const severity = log.issue?.severity || "";

      if (log.action === "status_change" && log.newStatus === "FIXED") {
        // Already covered by fixed issues query
        continue;
      }

      if (log.action === "status_change") {
        const statusLabels: Record<string, string> = {
          open: "مفتوح",
          in_progress: "قيد التنفيذ",
          fixed: "تم الإصلاح",
          wont_fix: "لن يُصلح",
          accepted_risk: "مخاطر مقبولة",
        };
        const newLabel = statusLabels[log.newStatus || ""] || log.newStatus || "";
        activities.push({
          id: log.id,
          type: "issue_status_changed",
          description: `تم تغيير حالة [${log.issueId}] إلى "${newLabel}"`,
          timestamp: log.createdAt.toISOString(),
          issueId: log.issueId,
          severity,
        });
      } else if (log.action === "ai_analysis") {
        activities.push({
          id: log.id,
          type: "ai_analysis",
          description: `تحليل ذكي لـ [${log.issueId}]: ${log.details}`,
          timestamp: log.createdAt.toISOString(),
          issueId: log.issueId,
          severity,
        });
      } else if (log.action === "export") {
        activities.push({
          id: log.id,
          type: "export",
          description: log.details || "تم تصدير التقرير",
          timestamp: log.createdAt.toISOString(),
        });
      }
    }

    // Sort by timestamp descending and deduplicate
    const seen = new Set<string>();
    const unique: Activity[] = [];
    const sorted = activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const activity of sorted) {
      const key = `${activity.type}-${activity.issueId || ""}-${activity.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(activity);
      }
    }

    return NextResponse.json({ activities: unique.slice(0, 30) });
  } catch (error) {
    console.error("Activities API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل الأنشطة", activities: [] },
      { status: 500 }
    );
  }
}