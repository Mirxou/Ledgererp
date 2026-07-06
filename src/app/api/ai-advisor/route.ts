import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
    }

    /* ── Fetch audit context from DB ─────────────────────────────── */
    const allIssues = await db.auditIssue.findMany();
    const fixedIssues = allIssues.filter((i) => i.status === "FIXED");
    const criticalOpen = allIssues.filter((i) => i.severity === "CRITICAL" && i.status !== "FIXED");
    const highOpen = allIssues.filter((i) => i.severity === "HIGH" && i.status !== "FIXED");

    const contextSummary = `
📊 ملخص التدقيق:
- إجمالي المشاكل: ${allIssues.length}
- تم إصلاح: ${fixedIssues.length}
- حرج مفتوح: ${criticalOpen.length}
- مرتفع مفتوح: ${highOpen.length}

أعلى 5 مشاكل حرجة مفتوحة:
${criticalOpen.slice(0, 5).map((i) => `• [${i.issueId}] ${i.title} (${i.category}) - ${i.file}`).join("\n")}

أعلى 5 مشاكل مرتفعة مفتوحة:
${highOpen.slice(0, 5).map((i) => `• [${i.issueId}] ${i.title} (${i.category}) - ${i.file}`).join("\n")}
`.trim();

    /* ── Build messages ──────────────────────────────────────────── */
    const systemPrompt = `أنت مستشار أمني ذكي متخصص في تطبيقات Pi Network (شبكة بي). أنت جزء من لوحة تدقيق أمني لـ Ledgererp ERP.

أنت تساعد المطورين على:
1. فهم الثغرات الأمنية وتصنيفها
2. تحديد أفضل أولويات للإصلاح
3. تقديم توصيات عملية مفصلة
4. شرح المفاهيم الأمنية بالعربية

سياق التطبيق الحالي:
${contextSummary}

قواعد مهمة:
- أجب دائماً باللغة العربية
- كن مختصراً ومفيداً
- استخدم تنسيق Markdown للنصوص
- إذا سُئلت عن مشكلة محددة، قدم تحليلاً معمقاً
- ركّز على الصورة الكلية للأمان
- اقترح خطوات عملية وواقعية`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
    ];

    // Add conversation context if provided
    if (context && Array.isArray(context)) {
      for (const msg of context) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: "user" as const, content: message });

    /* ── Call AI ─────────────────────────────────────────────────── */
    const ai = await ZAI.create();
    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages,
      temperature: 0.4,
      max_tokens: 2500,
    });

    const responseText = completion.choices?.[0]?.message?.content || "عذراً، لم أتمكن من توليد رد. يرجى المحاولة مرة أخرى.";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("AI Advisor error:", error);
    return NextResponse.json(
      {
        response: "حدث خطأ أثناء الاتصال بالمستشار الذكي. يرجى المحاولة لاحقاً.",
        error: "فشل في الاتصال",
      },
      { status: 500 }
    );
  }
}