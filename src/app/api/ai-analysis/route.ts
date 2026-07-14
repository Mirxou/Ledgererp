import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueId } = body;

    if (!issueId) {
      return NextResponse.json({ error: "issueId مطلوب" }, { status: 400 });
    }

    const issue = await db.auditIssue.findUnique({ where: { issueId } });
    if (!issue) {
      return NextResponse.json({ error: "المشكلة غير موجودة" }, { status: 404 });
    }

    const prompt = `أنت خبير أمني متخصص في تدقيق التطبيقات. قم بتحليل المشكلة الأمنية التالية وقدم تحليلاً مفصلاً باللغة العربية:

**رقم المشكلة:** ${issue.issueId}
**الخطورة:** ${issue.severity}
**المصدر:** ${issue.source}
**الملف:** ${issue.file}${issue.line > 0 ? ` (سطر ${issue.line})` : ""}
**الفئة:** ${issue.category}
**العنوان:** ${issue.title}
**الوصف:** ${issue.description || "غير متوفر"}
**التوصية:** ${issue.recommendation || "غير متوفر"}

يرجى تقديم:
1. **مستوى الخطر:** (حرج / مرتفع / متوسط / منخفض)
2. **التحليل المفصل:** شرح أمني شامل للمشكلة وتأثيرها المحتمل
3. **الحل المقترح:** خطوات عملية مفصلة للإصلاح مع أمثلة كود إذا أمكن

أجب باللغة العربية بشكل احترافي ومفصل.`;

    const ai = await ZAI.create();
    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "أنت محقق أمني رقمي متخصص. قدم تحليلات أمنية دقيقة ومفصلة. أجب دائماً باللغة العربية.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisText = completion.choices?.[0]?.message?.content || "لم يتم الحصول على تحليل";

    // Determine risk level from analysis
    let riskLevel = "متوسط";
    if (analysisText.includes("حرج") || analysisText.includes("كارثي")) riskLevel = "حرج";
    else if (analysisText.includes("مرتفع") || analysisText.includes("خطير")) riskLevel = "مرتفع";
    else if (analysisText.includes("منخفض") || analysisText.includes("بسيط")) riskLevel = "منخفض";

    // Log the AI analysis
    await db.auditLog.create({
      data: {
        action: "ai_analysis",
        issueId: issue.issueId,
        details: `تحليل ذكي - مستوى الخطر: ${riskLevel}`,
      },
    });

    return NextResponse.json({
      analysis: analysisText,
      riskLevel,
      suggestedFix: issue.recommendation || "",
    });
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return NextResponse.json(
      { error: "فشل في إجراء التحليل الذكي", analysis: "حدث خطأ أثناء التحليل. يرجى المحاولة لاحقاً.", riskLevel: "غير محدد", suggestedFix: "" },
      { status: 500 },
    );
  }
}