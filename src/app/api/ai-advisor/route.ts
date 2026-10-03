import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/ai-advisor
 * AI advisor for the escrow platform — answers questions about your store,
 * invoices, escrow status, and provides business advice.
 * Uses REAL data from the database.
 */
export async function POST(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
    }

    /* ── Fetch real escrow context from DB ─────────────────────── */
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    let contextSummary = "";

    if (store) {
      const invoices = await db.invoice.findMany({ where: { storeId: store.id } });
      const products = await db.product.findMany({ where: { storeId: store.id } });
      const completed = invoices.filter((i) => i.status === "completed");
      const disputed = invoices.filter((i) => i.status === "disputed");
      const escrowed = invoices.filter((i) => ["paid_escrow", "shipped", "delivered"].includes(i.status));
      const escrowVolume = escrowed.reduce((s, i) => s + i.total, 0);
      const completedVolume = completed.reduce((s, i) => s + i.subtotal, 0);

      contextSummary = `
📊 ملخص متجرك:
- اسم المتجر: ${store.name}
- عدد المنتجات: ${products.length}
- إجمالي الفواتير: ${invoices.length}
- صفقات مكتملة: ${completed.length}
- في الضمان: ${escrowed.length} فاتورة (${escrowVolume.toFixed(2)}π)
- نزاعات: ${disputed.length}
- حجم المبيعات المكتملة: ${completedVolume.toFixed(2)}π
- متجر موثق: ${store.isVerified ? "نعم" : "لا"}
- مصدر المتجر: ${store.source === "pi_connected" ? "متجر Pi مربوط" : "Ledgererp"}
`.trim();
    } else {
      contextSummary = "لم تنشئ متجراً بعد.";
    }

    /* ── Build messages ──────────────────────────────────────────── */
    const systemPrompt = `أنت مستشار ذكي متخصص في منصة Ledgererp — منصة الفواتير والضمان الآمن لشبكة Pi Network.

أنت تساعد التجار على:
1. فهم حالة مبيعاتهم ومعاملاتهم
2. تحسين أداء متجرهم وزيادة المبيعات
3. إدارة الضمان والمعاملات الآمنة
4. التعامل مع النزاعات وحلها
5. تقديم نصائح حول التسعير والمنتجات

سياق التطبيق الحالي:
${contextSummary}

قواعد مهمة:
- أجب دائماً باللغة العربية
- كن مختصراً ومفيداً
- استخدم تنسيق Markdown للنصوص
- ركّز على تحسين الأعمال والمعاملات
- اقترح خطوات عملية وواقعية`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (context && Array.isArray(context)) {
      for (const msg of context) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

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
