import { NextResponse } from "next/server";

export async function GET() {
  const data = {
    network: {
      totalPioneers: 60_000_000,
      kycVerified: 18_000_000,
      mainnetApps: 42,
      testnetApps: 150,
      dailyActiveUsers: 4_200_000,
    },
    price: {
      piUsd: 0.0,
      marketCap: 0,
      testnetValue: "~$314,159 (estimated ecosystem value)",
    },
    ledgererp: {
      auditScore: 26,
      totalIssues: 114,
      fixedIssues: 0,
      inProgress: 0,
      complianceScore: 18,
      deploymentReady: false,
    },
    ecosystem: {
      categories: [
        { name: "التجارة الإلكترونية", count: 23, growth: 15.4 },
        { name: "الألعاب", count: 18, growth: 32.1 },
        { name: "التمويل اللامركزي", count: 12, growth: 28.7 },
        { name: "الخدمات المهنية", count: 9, growth: 12.3 },
        { name: "التعليم", count: 7, growth: 45.2 },
        { name: "الترفيه", count: 6, growth: 22.8 },
      ],
      topApps: [
        { name: "PiWork", category: "التجارة", users: "2.3M", rating: 4.8 },
        { name: "PiMall", category: "التجارة", users: "1.8M", rating: 4.6 },
        { name: "PiChat", category: "التواصل", users: "3.1M", rating: 4.9 },
        { name: "PiLearn", category: "التعليم", users: "890K", rating: 4.7 },
        { name: "PiGameHub", category: "الألعاب", users: "1.2M", rating: 4.5 },
      ],
      recentActivity: [
        { type: "app_launch", text: "تم إطلاق PiTrade v2.0", time: "2 ساعة" },
        { type: "milestone", text: "تجاوز عدد التطبيقات 40 تطبيق رئيسي", time: "5 ساعات" },
        { type: "security", text: "تم حل ثغرة أمنية في PiStore", time: "1 يوم" },
        { type: "kyc", text: "اكتمل التحقق لـ 500 ألف مستخدم جديد", time: "2 يوم" },
      ],
    },
    liveMetrics: {
      tps: Math.floor(Math.random() * 50 + 100),
      blockHeight: 18_400_000 + Math.floor(Math.random() * 1000),
      mempoolSize: Math.floor(Math.random() * 200 + 50),
      networkHealth: "ممتاز" as const,
      uptime: "99.97%",
    },
  };

  return NextResponse.json(data);
}