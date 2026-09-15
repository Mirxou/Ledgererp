import { NextResponse } from "next/server";

/* ── Types ─────────────────────────────────────────────────────────── */

interface SecurityDimension {
  name: string;
  score: number;
  trend: "up" | "down" | "same";
  change: number;
}

interface WeeklyTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  fixed: number;
}

interface ThreatCategory {
  category: string;
  count: number;
  severity: "critical" | "high" | "medium" | "low";
}

interface AnalyticsResponse {
  securityDimensions: SecurityDimension[];
  weeklyTrend: WeeklyTrendPoint[];
  threatDistribution: ThreatCategory[];
  overallGrade: string;
  riskScore: number;
}

/* ── Mock Security Dimensions ──────────────────────────────────────── */

const SECURITY_DIMENSIONS: SecurityDimension[] = [
  { name: "أمان المصادقة",     score: 45, trend: "up",    change: 5 },
  { name: "حماية البيانات",    score: 62, trend: "down",  change: -3 },
  { name: "أمان الشبكة",       score: 38, trend: "same",  change: 0 },
  { name: "حماية الواجهات",    score: 55, trend: "up",    change: 8 },
  { name: "إدارة الهوية",      score: 70, trend: "up",    change: 4 },
  { name: "تشفير البيانات",    score: 50, trend: "down",  change: -7 },
  { name: "توافق Pi Network",  score: 42, trend: "down",  change: -2 },
  { name: "جودة الكود",        score: 58, trend: "up",    change: 3 },
];

/* ── Mock Weekly Trend (4 weeks) ───────────────────────────────────── */

function generateWeeklyTrend(): WeeklyTrendPoint[] {
  const weeks: WeeklyTrendPoint[] = [];
  const baseDate = new Date("2025-01-09");

  const trends = [
    { critical: 5,  high: 12, medium: 8,  fixed: 3 },
    { critical: 3,  high: 10, medium: 6,  fixed: 7 },
    { critical: 7,  high: 15, medium: 11, fixed: 5 },
    { critical: 4,  high: 9,  medium: 7,  fixed: 12 },
  ];

  for (let i = 0; i < 4; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i * 7);
    weeks.push({
      date: date.toISOString().split("T")[0],
      ...trends[i],
    });
  }

  return weeks;
}

/* ── Mock Threat Distribution ──────────────────────────────────────── */

const THREAT_DISTRIBUTION: ThreatCategory[] = [
  { category: "XSS",              count: 12, severity: "critical" },
  { category: "Authentication",    count: 8,  severity: "high" },
  { category: "SQL Injection",     count: 6,  severity: "critical" },
  { category: "CSRF",              count: 5,  severity: "high" },
  { category: "Data Exposure",     count: 9,  severity: "high" },
  { category: "Cryptography",      count: 4,  severity: "medium" },
  { category: "Pi Network",        count: 7,  severity: "high" },
  { category: "KYC Bypass",        count: 3,  severity: "critical" },
  { category: "Hardcoded Secrets", count: 6,  severity: "medium" },
  { category: "Code Quality",      count: 11, severity: "low" },
  { category: "Authorization",     count: 5,  severity: "high" },
  { category: "Supply Chain",      count: 2,  severity: "medium" },
];

/* ── Grade Calculation ─────────────────────────────────────────────── */

function calculateGrade(avgScore: number): string {
  if (avgScore >= 90) return "A+";
  if (avgScore >= 85) return "A";
  if (avgScore >= 80) return "A-";
  if (avgScore >= 75) return "B+";
  if (avgScore >= 70) return "B";
  if (avgScore >= 65) return "B-";
  if (avgScore >= 60) return "C+";
  if (avgScore >= 55) return "C";
  if (avgScore >= 50) return "C-";
  if (avgScore >= 45) return "D+";
  if (avgScore >= 40) return "D";
  return "F";
}

/* ── Cache ─────────────────────────────────────────────────────────── */

const cache = new Map<string, { data: AnalyticsResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* ── GET ───────────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const cacheKey = "analytics:all";
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const avgScore = Math.round(
      SECURITY_DIMENSIONS.reduce((sum, d) => sum + d.score, 0) / SECURITY_DIMENSIONS.length
    );

    const overallGrade = calculateGrade(avgScore);
    const riskScore = 100 - avgScore;

    const response: AnalyticsResponse = {
      securityDimensions: SECURITY_DIMENSIONS,
      weeklyTrend: generateWeeklyTrend(),
      threatDistribution: THREAT_DISTRIBUTION,
      overallGrade,
      riskScore,
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