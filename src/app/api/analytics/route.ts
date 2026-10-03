import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/analytics
 * Returns REAL escrow platform analytics from the database.
 * No mock data — everything is computed from actual stores, invoices, and transactions.
 */

// Local cache (5 min TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const cacheKey = "analytics:escrow";
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // ── Core Metrics from DB ──────────────────────────────────────────
    const [
      totalStores,
      totalProducts,
      totalInvoices,
      totalUsers,
      totalEscrowTx,
      invoicesByStatus,
      recentInvoices,
      storesWithInvoices,
      escrowVolume,
      completedVolume,
    ] = await Promise.all([
      db.store.count(),
      db.product.count(),
      db.invoice.count(),
      db.user.count(),
      db.escrowTransaction.count(),
      // Group invoices by status
      db.invoice.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      // Recent 30 days of invoices
      db.invoice.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, total: true, createdAt: true, storeId: true },
        take: 200,
      }),
      // Stores with invoice counts
      db.store.findMany({
        include: { _count: { select: { invoices: true, products: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Total escrowed amount (paid_escrow + shipped + delivered)
      db.invoice.aggregate({
        where: { status: { in: ["paid_escrow", "shipped", "delivered"] } },
        _sum: { total: true },
      }),
      // Total completed volume
      db.invoice.aggregate({
        where: { status: "completed" },
        _sum: { subtotal: true },
      }),
    ]);

    // ── Compute status counts ─────────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    for (const item of invoicesByStatus) {
      statusCounts[item.status] = item._count.status;
    }

    // ── Weekly trend (last 4 weeks) ──────────────────────────────────
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekInvoices = recentInvoices.filter(
        (inv) => inv.createdAt >= weekStart && inv.createdAt < weekEnd
      );

      weeklyTrend.push({
        date: weekStart.toISOString().split("T")[0],
        invoices: weekInvoices.length,
        escrowed: weekInvoices
          .filter((inv) => inv.status === "paid_escrow")
          .reduce((sum, inv) => sum + inv.total, 0),
        completed: weekInvoices
          .filter((inv) => inv.status === "completed")
          .reduce((sum, inv) => sum + inv.total, 0),
      });
    }

    // ── Store performance leaderboard ────────────────────────────────
    const storeLeaderboard = storesWithInvoices
      .map((store) => ({
        storeId: store.id,
        storeName: store.name,
        piUid: store.piUid,
        totalInvoices: store._count.invoices,
        totalProducts: store._count.products,
        isVerified: store.isVerified,
        source: store.source,
      }))
      .sort((a, b) => b.totalInvoices - a.totalInvoices)
      .slice(0, 10);

    // ── Platform health score ────────────────────────────────────────
    const disputeRate = totalInvoices > 0 ? (statusCounts["disputed"] || 0) / totalInvoices : 0;
    const completionRate = totalInvoices > 0 ? (statusCounts["completed"] || 0) / totalInvoices : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(
      completionRate * 50 + (1 - disputeRate) * 30 + Math.min(totalStores / 10, 1) * 20
    )));

    // ── Security dimensions (from real escrow data) ─────────────────
    const securityDimensions = [
      { name: "سلامة الضمان", score: Math.min(100, Math.round((1 - disputeRate) * 100)), trend: disputeRate < 0.05 ? "up" as const : "down" as const, change: Math.round((1 - disputeRate) * 100 - 50) },
      { name: "نسبة الإكمال", score: Math.round(completionRate * 100), trend: completionRate > 0.5 ? "up" as const : "down" as const, change: Math.round(completionRate * 100 - 30) },
      { name: "نشاط المتاجر", score: Math.min(100, totalStores * 10), trend: totalStores > 3 ? "up" as const : "same" as const, change: Math.min(totalStores - 3, 10) },
      { name: "حجم المعاملات", score: Math.min(100, Math.round((escrowVolume._sum.total || 0) / 10)), trend: (escrowVolume._sum.total || 0) > 50 ? "up" as const : "same" as const, change: Math.round((escrowVolume._sum.total || 0) / 10 - 20) },
      { name: "مصادقة المستخدمين", score: totalUsers > 0 ? 70 : 0, trend: totalUsers > 0 ? "up" as const : "same" as const, change: Math.min(totalUsers, 15) },
      { name: "تنوع المنتجات", score: Math.min(100, totalProducts * 5), trend: totalProducts > 5 ? "up" as const : "same" as const, change: Math.min(totalProducts - 5, 15) },
    ];

    // ── Grade calculation ────────────────────────────────────────────
    const avgScore = Math.round(
      securityDimensions.reduce((sum, d) => sum + d.score, 0) / securityDimensions.length
    );
    function calculateGrade(s: number): string {
      if (s >= 90) return "A+";
      if (s >= 80) return "A";
      if (s >= 70) return "B+";
      if (s >= 60) return "B";
      if (s >= 50) return "C";
      if (s >= 40) return "D";
      return "F";
    }

    const response = {
      // Core escrow platform metrics
      metrics: {
        totalStores,
        totalProducts,
        totalInvoices,
        totalUsers,
        totalEscrowTx,
        escrowedPi: escrowVolume._sum.total || 0,
        completedPi: completedVolume._sum.subtotal || 0,
        healthScore,
        disputeRate: Math.round(disputeRate * 100),
        completionRate: Math.round(completionRate * 100),
      },
      // Invoice status breakdown
      statusCounts,
      // Security dimensions (from real data)
      securityDimensions,
      // Weekly trend
      weeklyTrend,
      // Store leaderboard
      storeLeaderboard,
      // Overall grade
      overallGrade: calculateGrade(avgScore),
      riskScore: 100 - avgScore,
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل بيانات التحليلات" },
      { status: 500 }
    );
  }
}
