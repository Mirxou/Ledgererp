import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────────────────── */

interface AiScanRequest {
  scope?: "full" | "critical" | "high";
}

/* ── POST ──────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiScanRequest;
    const scope = body.scope || "full";

    /* ── Fetch issues from DB ─────────────────────────────────────── */
    let issues = await db.auditIssue.findMany();

    // Filter by scope
    if (scope === "critical") {
      issues = issues.filter((i) => i.severity === "CRITICAL" && i.status !== "FIXED");
    } else if (scope === "high") {
      issues = issues.filter(
        (i) => (i.severity === "CRITICAL" || i.severity === "HIGH") && i.status !== "FIXED"
      );
    } else {
      issues = issues.filter((i) => i.status !== "FIXED");
    }

    /* ── Group by severity ────────────────────────────────────────── */
    const bySeverity: Record<string, typeof issues> = {};
    for (const issue of issues) {
      const sev = issue.severity || "UNKNOWN";
      if (!bySeverity[sev]) bySeverity[sev] = [];
      bySeverity[sev].push(issue);
    }

    /* ── Group by category ────────────────────────────────────────── */
    const byCategory: Record<string, typeof issues> = {};
    for (const issue of issues) {
      const cat = issue.category || "أخرى";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(issue);
    }

    /* ── Build summary for AI prompt ──────────────────────────────── */
    const severitySummary = Object.entries(bySeverity)
      .map(([sev, items]) => `  - ${sev}: ${items.length} مشكلة`)
      .join("\n");

    const categorySummary = Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([cat, items]) => `  - ${cat}: ${items.length} مشكلة`)
      .join("\n");

    const topIssues = issues
      .sort((a, b) => {
        const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
        return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
      })
      .slice(0, 15)
      .map((i) => `  - [${i.issueId}] ${i.title} | الخطورة: ${i.severity} | الفئة: ${i.category} | الملف: ${i.file}:${i.line}`)
      .join("\n");

    /* ── Build AI prompt (Arabic) ─────────────────────────────────── */
    const systemPrompt = `أنت محلل أمني متقدم متخصص في فحص تطبيقات Pi Network وشبكات البلوكتشين. تقوم بتحليل شامل لنتائج التدقيق الأمني وتقديم تقييم مفصل.

يجب أن تُجيب دائماً باللغة العربية وبصيغة JSON صحيحة فقط، بدون أي نص إضافي قبل أو بعد JSON.

أجب بالصيغة التالية بالضبط:
{
  "summary": "ملخص نصي شامل للمشروع الأمني",
  "riskAssessment": "منخفض|متوسط|مرتفع|حرج",
  "priorityActions": [
    { "title": "عنوان الإجراء", "reason": "السبب التفصيلي", "effort": "منخفض|متوسط|مرتفع" }
  ],
  "codePatterns": [
    { "pattern": "اسم النمط الخبيث", "count": عدد, "risk": "critical|high|medium|low" }
  ],
  "recommendations": "توصيات نصية شاملة ومفصلة"
}`;

    const userPrompt = `قم بتحليل شامل لنتائج التدقيق الأمني التالية لنظام Ledgererp ERP المتكامل مع Pi Network:

## نطاق الفحص: ${scope === "full" ? "شامل" : scope === "critical" ? "حرج فقط" : "حرج ومرتفع"}

## إحصائيات عامة:
- إجمالي المشاكل المفتوحة: ${issues.length}

## التوزيع حسب الخطورة:
${severitySummary}

## التوزيع حسب الفئة:
${categorySummary}

## أعلى 15 مشكلة:
${topIssues}

## المطلوب:
1. اكتب ملخصاً شاملاً لحالة الأمان
2. قيّم مستوى الخطر (منخفض/متوسط/مرتفع/حرج)
3. حدد 5 إجراءات أولوية مع الأسباب ومستوى الجهد
4. استخرج 8 أنماط كود خبيثة متكررة مع العدد ومستوى الخطورة
5. اكتب توصيات شاملة ومفصلة للتحسين

تذكر: أجب بـ JSON صحيح فقط بدون أي نص إضافي.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    /* ── Call AI ─────────────────────────────────────────────────── */
    const ai = await ZAI.create();
    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: 3000,
    });

    const responseText = completion.choices?.[0]?.message?.content || "";

    /* ── Parse AI response ───────────────────────────────────────── */
    let parsedResponse;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      const jsonStr = (jsonMatch[1] || responseText).trim();
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return raw text as summary
      parsedResponse = {
        summary: responseText || "لم يتم الحصول على تحليل من الذكاء الاصطناعي",
        riskAssessment: "غير محدد",
        priorityActions: [],
        codePatterns: [],
        recommendations: "",
      };
    }

    /* ── Enrich with DB stats ────────────────────────────────────── */
    const totalIssues = await db.auditIssue.findMany();
    const fixedIssues = totalIssues.filter((i) => i.status === "FIXED");

    return NextResponse.json({
      ...parsedResponse,
      scanMeta: {
        scope,
        scannedAt: new Date().toISOString(),
        totalOpen: issues.length,
        totalFixed: fixedIssues.length,
        totalAll: totalIssues.length,
      },
    });
  } catch (error) {
    console.error("AI Scan API error:", error);
    return NextResponse.json(
      {
        error: "فشل في إجراء الفحص الأمني بالذكاء الاصطناعي",
        details: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة لاحقاً.",
      },
      { status: 500 }
    );
  }
}