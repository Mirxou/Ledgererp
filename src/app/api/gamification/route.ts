import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  XP_PER_SEVERITY,
  calculateLevel,
  getXpForNextLevel,
  getAchievementProgress,
  ACHIEVEMENTS,
  type AchievementProgress,
} from "@/lib/gamification";

export async function GET() {
  try {
    /* ── Fetch fixed issues from DB ──────────────────────────────── */
    const fixedIssues = await db.auditIssue.findMany({
      where: { status: "FIXED" },
    });

    /* ── Count by severity ───────────────────────────────────────── */
    const criticalFixed = fixedIssues.filter((i) => i.severity === "CRITICAL").length;
    const highFixed = fixedIssues.filter((i) => i.severity === "HIGH").length;
    const mediumFixed = fixedIssues.filter((i) => i.severity === "MEDIUM").length;
    const lowFixed = fixedIssues.filter((i) => i.severity === "LOW").length;
    const totalFixed = fixedIssues.length;

    /* ── Calculate XP ────────────────────────────────────────────── */
    const xpBreakdown = {
      critical: criticalFixed * XP_PER_SEVERITY.CRITICAL,
      high: highFixed * XP_PER_SEVERITY.HIGH,
      medium: mediumFixed * XP_PER_SEVERITY.MEDIUM,
      low: lowFixed * XP_PER_SEVERITY.LOW,
    };
    const xp = xpBreakdown.critical + xpBreakdown.high + xpBreakdown.medium + xpBreakdown.low;
    const level = calculateLevel(xp);

    /* ── Calculate streak (consecutive days with fixes) ──────────── */
    const streak = await calculateStreak(fixedIssues);

    /* ── Category counts for achievements ────────────────────────── */
    const allIssues = await db.auditIssue.findMany();

    const encryptionCategories = ["Cryptography", "Hardcoded Secret", "Weak Cryptography"];
    const authCategories = ["Authentication", "Authorization"];
    const xssCategories = ["XSS"];
    const codeQualityCategories = ["Code Quality", "Runtime", "Supply Chain"];
    const piCategories = ["Pi Network Compliance", "KYC", "Fake KYC", "Custodial", "Non-Custodial"];

    const encryptionTotal = allIssues.filter((i) => encryptionCategories.some((c) => i.category.includes(c))).length;
    const encryptionFixed = fixedIssues.filter((i) => encryptionCategories.some((c) => i.category.includes(c))).length;

    const authTotal = allIssues.filter((i) => authCategories.some((c) => i.category.includes(c))).length;
    const authFixed = fixedIssues.filter((i) => authCategories.some((c) => i.category.includes(c))).length;

    const xssTotal = allIssues.filter((i) => xssCategories.some((c) => i.category.includes(c))).length;
    const xssFixed = fixedIssues.filter((i) => xssCategories.some((c) => i.category.includes(c))).length;

    const codeQualityTotal = allIssues.filter((i) => codeQualityCategories.some((c) => i.category.includes(c))).length;
    const codeQualityFixed = fixedIssues.filter((i) => codeQualityCategories.some((c) => i.category.includes(c))).length;

    const piTotal = allIssues.filter((i) => piCategories.some((c) => i.category.includes(c)) || i.source === "Pi Network").length;
    const piFixed = fixedIssues.filter((i) => piCategories.some((c) => i.category.includes(c)) || i.source === "Pi Network").length;

    /* ── Fixed today ─────────────────────────────────────────────── */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fixedToday = fixedIssues.filter(
      (i) => i.fixedAt && i.fixedAt >= today
    ).length;

    /* ── Achievement progress ────────────────────────────────────── */
    const achievements: AchievementProgress[] = ACHIEVEMENTS.map((ach) =>
      getAchievementProgress(ach, {
        totalFixed,
        criticalFixed,
        encryptionFixed,
        encryptionTotal,
        authFixed,
        authTotal,
        xssFixed,
        xssTotal,
        codeQualityFixed,
        codeQualityTotal,
        piFixed,
        piTotal,
        level,
        fixedToday,
      }, [])
    );

    return NextResponse.json({
      profile: {
        level,
        xp,
        totalFixed,
        streak,
        achievements: [],
      },
      stats: {
        criticalFixed,
        highFixed,
        mediumFixed,
        lowFixed,
        totalFixed,
        xp,
        xpBreakdown,
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

/* ── Streak Calculation ───────────────────────────────────────────── */

async function calculateStreak(fixedIssues: { fixedAt: Date | null }[]): Promise<number> {
  if (fixedIssues.length === 0) return 0;

  const datesWithFixes = new Set<string>();
  for (const issue of fixedIssues) {
    if (issue.fixedAt) {
      const d = new Date(issue.fixedAt);
      datesWithFixes.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  if (datesWithFixes.size === 0) return 0;

  // Sort dates descending
  const sortedDates = Array.from(datesWithFixes)
    .map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m, day);
    })
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if most recent fix was today or yesterday
  const mostRecent = sortedDates[0];
  const diffFromToday = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  if (diffFromToday > 1) return 0;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.floor(
      (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}