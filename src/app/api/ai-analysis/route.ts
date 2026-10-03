import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/ai-analysis
 * AI analysis of a specific invoice (dispute/issue).
 * Uses REAL data from the database.
 */
export async function POST(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId مطلوب" }, { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, store: { select: { name: true, piUid: true } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const prompt = `أنت خبير في منصة Ledgererp للضمان الآمن. قم بتحليل الفاتورة التالية وقدم تحليلاً مفصلاً باللغة العربية:

**رقم الفاتورة:** ${invoice.invoiceNumber}
**المتجر:** ${invoice.store?.name || "غير معروف"}
**الزبون:** ${invoice.customerName || invoice.customerPiUid}
**الحالة:** ${invoice.status}
**المجموع:** ${invoice.total}π
**رسوم الضمان:** ${invoice.escrowFee}π
**الملاحظات:** ${invoice.notes || "لا يوجد"}
**المنتجات:** ${invoice.items.map((i) => `${i.productName} x${i.quantity} = ${i.totalPrice}π`).join(", ")}

يرجى تقديم:
1. **مستوى الخطر:** (حرج / مرتفع / متوسط / منخفض)
2. **التحليل المفصل:** شرح شامل لحالة الفاتورة
3. **التوصية:** خطوات عملية مقترحة

أجب باللغة العربية بشكل احترافي ومفصل.`;

    const ai = await ZAI.create();
    const completion = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "أنت مستشار ضمان آمن متخصص. أجب دائماً باللغة العربية." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysisText = completion.choices?.[0]?.message?.content || "لم يتم الحصول على تحليل";

    let riskLevel = "متوسط";
    if (analysisText.includes("حرج") || analysisText.includes("كارثي")) riskLevel = "حرج";
    else if (analysisText.includes("مرتفع") || analysisText.includes("خطير")) riskLevel = "مرتفع";
    else if (analysisText.includes("منخفض") || analysisText.includes("بسيط")) riskLevel = "منخفض";

    // Log the AI analysis
    await db.auditLog.create({
      data: {
        action: "ai_analysis",
        userId: auth.user.uid,
        entity: "invoice",
        entityId: invoiceId,
        details: `تحليل ذكي - مستوى الخطر: ${riskLevel}`,
      },
    });

    return NextResponse.json({
      analysis: analysisText,
      riskLevel,
      suggestedFix: `فاتورة ${invoice.invoiceNumber} — ${invoice.status}`,
    });
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return NextResponse.json(
      { error: "فشل في إجراء التحليل الذكي", analysis: "حدث خطأ أثناء التحليل. يرجى المحاولة لاحقاً.", riskLevel: "غير محدد", suggestedFix: "" },
      { status: 500 },
    );
  }
}
