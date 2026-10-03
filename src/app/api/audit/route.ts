import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/audit
 * Returns REAL escrow platform audit trail from the database.
 * Audit logs track all invoice status changes, payments, releases, disputes.
 */
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    // Fetch audit logs
    const auditLogs = await db.auditLog.findMany({
      where: { userId: auth.user.uid },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch escrow transactions
    const escrowTransactions = await db.escrowTransaction.findMany({
      where: {
        OR: [
          { fromUid: auth.user.uid },
          { toUid: auth.user.uid },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Compute summary from real data
    const totalLogs = auditLogs.length;
    const totalTx = escrowTransactions.length;
    const u2aTx = escrowTransactions.filter((t) => t.type === "U2A");
    const a2uTx = escrowTransactions.filter((t) => t.type === "A2U");

    const summary = {
      totalLogs,
      totalEscrowTx: totalTx,
      u2aPayments: u2aTx.length,
      a2uReleases: a2uTx.length,
      u2aVolume: u2aTx.reduce((s, t) => s + t.amount, 0),
      a2uVolume: a2uTx.reduce((s, t) => s + t.amount, 0),
    };

    // Group logs by action type
    const logsByAction: Record<string, number> = {};
    for (const log of auditLogs) {
      logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;
    }

    return NextResponse.json({
      meta: {
        projectName: "Ledgererp",
        description: "منصة الفواتير والضمان الآمن لشبكة Pi Network",
        auditDate: new Date().toISOString(),
        storeName: store?.name || "لا يوجد متجر",
        totalLogs,
        totalEscrowTx: totalTx,
      },
      summary,
      logsByAction,
      recentLogs: auditLogs.slice(0, 20),
      recentEscrowTx: escrowTransactions.slice(0, 10),
    });
  } catch (error) {
    console.error("Audit API error:", error);
    return NextResponse.json({ error: "فشل في تحميل سجل التدقيق" }, { status: 500 });
  }
}
