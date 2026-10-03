import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/gamification
 * Returns REAL escrow platform gamification data from the database.
 * XP and levels are computed from actual escrow transactions, not security audit issues.
 */

export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    // Ensure user exists
    const user = await db.user.upsert({
      where: { piUid: auth.user.uid },
      update: { lastLoginAt: new Date() },
      create: { piUid: auth.user.uid, username: auth.user.username },
    });

    // ── Fetch user's store and invoices ──────────────────────────────
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    let merchantInvoices = 0;
    let completedDeals = 0;
    let totalEscrowed = 0;
    let totalReleased = 0;
    let buyerOrders = 0;
    let disputed = 0;
    let productsListed = 0;

    if (store) {
      const invoices = await db.invoice.findMany({
        where: { storeId: store.id },
      });
      merchantInvoices = invoices.length;
      completedDeals = invoices.filter((i) => i.status === "completed").length;
      totalEscrowed = invoices
        .filter((i) => ["paid_escrow", "shipped", "delivered", "completed"].includes(i.status))
        .reduce((sum, i) => sum + i.total, 0);
      totalReleased = invoices
        .filter((i) => i.status === "completed")
        .reduce((sum, i) => sum + i.subtotal, 0);
      disputed = invoices.filter((i) => i.status === "disputed").length;
      productsListed = await db.product.count({ where: { storeId: store.id } });
    }

    // Buyer-side stats
    const buyerInvoices = await db.invoice.findMany({
      where: { customerPiUid: auth.user.uid },
    });
    buyerOrders = buyerInvoices.length;

    // ── Calculate XP (escrow-based, not security-based) ──────────────
    const xpBreakdown = {
      completedDeals: completedDeals * 100,        // 100 XP per completed deal
      escrowVolume: Math.floor(totalReleased * 10), // 10 XP per Pi released
      productsListed: productsListed * 15,          // 15 XP per product
      buyerOrders: buyerOrders * 20,                // 20 XP per buyer order
      verified: store?.isVerified ? 200 : 0,        // 200 XP for verified store
      disputesLost: disputed * -50,                  // -50 XP per dispute
    };

    const xp = Math.max(0, Object.values(xpBreakdown).reduce((sum, v) => sum + v, 0));
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
    const xpForNext = (level * level) * 100;

    // ── Streak: consecutive days with completed deals ────────────────
    let streak = 0;
    if (store) {
      const completedInvoices = await db.invoice.findMany({
        where: { storeId: store.id, status: "completed", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      });

      if (completedInvoices.length > 0) {
        const datesWithCompletions = new Set<string>();
        for (const inv of completedInvoices) {
          if (inv.completedAt) {
            const d = inv.completedAt;
            datesWithCompletions.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          }
        }

        const sortedDates = Array.from(datesWithCompletions).sort().reverse();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

        if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const [y1, m1, d1] = sortedDates[i - 1].split("-").map(Number);
            const [y2, m2, d2] = sortedDates[i].split("-").map(Number);
            const date1 = new Date(y1, m1, d1);
            const date2 = new Date(y2, m2, d2);
            const diff = Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
            if (diff === 1) streak++;
            else break;
          }
        }
      }
    }

    // ── Achievements (escrow-based) ──────────────────────────────────
    const achievements = [
      { id: "first_deal", title: "أول صفقة", description: "أكمل أول صفقة", progress: Math.min(completedDeals, 1), target: 1, unlocked: completedDeals >= 1 },
      { id: "five_deals", title: "تاجر نشيط", description: "أكمل 5 صفقات", progress: Math.min(completedDeals, 5), target: 5, unlocked: completedDeals >= 5 },
      { id: "ten_deals", title: "تاجر محترف", description: "أكمل 10 صفقات", progress: Math.min(completedDeals, 10), target: 10, unlocked: completedDeals >= 10 },
      { id: "first_100pi", title: "مئوية Pi", description: "أطلق 100π في الضمان", progress: Math.min(Math.floor(totalReleased), 100), target: 100, unlocked: totalReleased >= 100 },
      { id: "verified", title: "متجر موثق", description: "احصل على التحقق", progress: store?.isVerified ? 1 : 0, target: 1, unlocked: !!store?.isVerified },
      { id: "products_10", title: "عرض غني", description: "أضف 10 منتجات", progress: Math.min(productsListed, 10), target: 10, unlocked: productsListed >= 10 },
      { id: "buyer_5", title: "مشترٍ نشيط", description: "اطلب من 5 متاجر", progress: Math.min(buyerOrders, 5), target: 5, unlocked: buyerOrders >= 5 },
      { id: "streak_7", title: "أسبوع متواصل", description: "7 أيام متتالية", progress: Math.min(streak, 7), target: 7, unlocked: streak >= 7 },
    ];

    return NextResponse.json({
      profile: {
        level,
        xp,
        totalDeals: completedDeals,
        streak,
        achievements: achievements.filter((a) => a.unlocked).length,
      },
      stats: {
        merchantInvoices,
        completedDeals,
        buyerOrders,
        productsListed,
        totalEscrowed: Math.round(totalEscrowed * 100) / 100,
        totalReleased: Math.round(totalReleased * 100) / 100,
        disputed,
        xp,
        xpBreakdown,
        xpForNext,
      },
      achievements,
    });
  } catch (error) {
    console.error("Gamification API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل بيانات اللعب" },
      { status: 500 }
    );
  }
}
