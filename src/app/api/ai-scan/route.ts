import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/ai-scan
 * AI scan of your escrow platform — analyzes store health, invoice patterns,
 * and provides actionable recommendations. Uses REAL data from the database.
 */
export async function POST(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as { scope?: "full" | "store" | "invoices" };
    const scope = body.scope || "full";

    /* ── Fetch real data from DB ─────────────────────────────────────── */
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    if (!store) {
      return NextResponse.json({
        summary: "لم تنشئ متجراً بعد. أنشئ متجرك أولاً لتتمكن من الفحص.",
        riskAssessment: "غير محدد",
        priorityActions: [],
        recommendations: "أنشئ متجراً وأضف منتجات لبدء استقبال الطلبات.",
      });
    }

    const invoices = await db.invoice.findMany({ where: { storeId: store.id } });
    const products = await db.product.findMany({ where: { storeId: store.id } });
    const escrowTx = await db.escrowTransaction.findMany({
      where: { fromUid: auth.user.uid },
    });

    // Compute stats
    const completed = invoices.filter((i) => i.status === "completed");
    const disputed = invoices.filter((i) => i.status === "disputed");
    const pending = invoices.filter((i) => i.status === "pending");
    const escrowed = invoices.filter((i) => ["paid_escrow", "shipped", "delivered"].includes(i.status));
    const escrowVolume = escrowed.reduce((s, i) => s + i.total, 0);
    const completedVolume = completed.reduce((s, i) => s + i.subtotal, 0);
    const disputeRate = invoices.length > 0 ? disputed.length / invoices.length : 0;
    const completionRate = invoices.length > 0 ? completed.length / invoices.length : 0;
    const activeProducts = products.filter((p) => p.isActive).length;

    /* ── Build AI prompt ─────────────────────────────────────────── */
    const systemPrompt = `أنت محلل أعمال متقدم متخصص في منصات التجارة الإلكترونية والضمان الآمن على شبكة Pi Network.
تحلل بيانات المتجر والمعاملات وتقدم تقييم مفصل.

أجب باللغة العربية وبصيغة JSON صحيحة فقط:
{
  "summary": "ملخص شامل لحالة المتجر",
  "riskAssessment": "منخفض|متوسط|مرتفع|حرج",
  "priorityActions": [
    { "title": "عنوان الإجراء", "reason": "السبب", "effort": "منخفض|متوسط|مرتفع" }
  ],
  "recommendations": "توصيات شاملة ومفصلة"
}`;

    const userPrompt = `حلل متجر "${store.name}" على منصة Ledgererp:

## نطاق الفحص: ${scope === "full" ? "شامل" : scope === "store" ? "المتجر فقط" : "الفواتير فقط"}

## بيانات المتجر:
- المنتجات: ${products.length} (${activeProducts} نشط)
- متجر موثق: ${store.isVerified ? "نعم" : "لا"}
- مصدر: ${store.source}

## بيانات المعاملات:
- إجمالي الفواتير: ${invoices.length}
- مكتملة: ${completed.length}
- في الضمان: ${escrowed.length} (${escrowVolume.toFixed(2)}π)
- بانتظار الدفع: ${pending.length}
- نزاعات: ${disputed.length}
- نسبة الإكمال: ${(completionRate * 100).toFixed(1)}%
- نسبة النزاعات: ${(disputeRate * 100).toFixed(1)}%
- حجم المبيعات المكتملة: ${completedVolume.toFixed(2)}π
- معاملات الضمان المسجلة: ${escrowTx.length}

## المطلوب:
1. ملخص شامل لحالة المتجر
2. تقييم مستوى الخطر
3. 5 إجراءات أولوية مع الأسباب ومستوى الجهد
4. توصيات شاملة للتحسين`;

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
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      const jsonStr = (jsonMatch[1] || responseText).trim();
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      parsedResponse = {
        summary: responseText || "لم يتم الحصول على تحليل",
        riskAssessment: "غير محدد",
        priorityActions: [],
        recommendations: "",
      };
    }

    // Log the scan
    await db.auditLog.create({
      data: {
        action: "ai_scan",
        userId: auth.user.uid,
        entity: "store",
        entityId: store.id,
        details: `فحص ${scope}: نسبة إكمال ${(completionRate * 100).toFixed(1)}%, نزاعات ${(disputeRate * 100).toFixed(1)}%`,
      },
    });

    return NextResponse.json({
      ...parsedResponse,
      scanMeta: {
        scope,
        scannedAt: new Date().toISOString(),
        storeName: store.name,
        totalInvoices: invoices.length,
        totalProducts: products.length,
        completionRate: Math.round(completionRate * 100),
        disputeRate: Math.round(disputeRate * 100),
      },
    });
  } catch (error) {
    console.error("AI Scan API error:", error);
    return NextResponse.json(
      {
        error: "فشل في إجراء الفحص بالذكاء الاصطناعي",
        details: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة لاحقاً.",
      },
      { status: 500 }
    );
  }
}
