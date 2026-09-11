"use client";

import React, { useState, useEffect } from "react";
import {
  Zap, CheckCircle2, Wallet, Loader2, Send, FileCheck,
  XCircle, Trash2, Copy, ExternalLink, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { copyText } from "@/lib/helpers";

interface TestPaymentRecord {
  uid: string;
  amount: string;
  memo: string;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  simulated?: boolean;
  error?: string;
}

/* ═══ Pi Setup ═══ */
export function PiSetupView({ piUid }: { piUid: string }) {
  const toast = useToast().toast;
  const [uid, setUid] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [memo, setMemo] = useState("Testnet A2U test payment");
  const [sending, setSending] = useState(false);
  const [simMode, setSimMode] = useState(true); // Default: simulation mode ON (for dev/testing)
  const [payments, setPayments] = useState<TestPaymentRecord[]>([]);
  const [walletCheck, setWalletCheck] = useState<{ checked: boolean; configured: boolean; walletAddress: string; message: string; hasSimulated?: boolean }>({
    checked: false, configured: false, walletAddress: "", message: "", hasSimulated: false,
  });

  // Count unique UIDs from completed payments
  const completedPayments = payments.filter(function(p) { return p.status === "completed"; });
  const uniqueUids = new Set(completedPayments.map(function(p) { return p.uid; }));
  const uniqueCount = uniqueUids.size;
  const progressPercent = Math.min((uniqueCount / 5) * 100, 100);
  const requirementMet = uniqueCount >= 5;

  // Check testnet wallet status on mount
  useEffect(function() {
    api.get("/api/pi/testnet-a2u", piUid)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        setWalletCheck({ checked: true, configured: data.configured, walletAddress: data.walletAddress || "", message: data.message || "", hasSimulated: data.hasSimulated || false });
        // Load any existing payments from server
        if (data.recentPayments && data.recentPayments.length > 0) {
          const serverPayments: TestPaymentRecord[] = data.recentPayments.map(function(p: Record<string, unknown>) {
            return {
              uid: String(p.uid),
              amount: String(p.amount),
              memo: String(p.memo),
              status: p.status as "pending" | "completed" | "failed",
              timestamp: String(p.createdAt),
              error: p.error ? String(p.error) : undefined,
            };
          });
          // Merge with local state, avoiding duplicates
          const localUids = new Set(payments.map(function(lp) { return lp.uid + lp.timestamp; }));
          const newFromServer = serverPayments.filter(function(sp) { return !localUids.has(sp.uid + sp.timestamp); });
          setPayments(function(prev) { return newFromServer.concat(prev); });
        }
      })
      .catch(function() {
        setWalletCheck({ checked: true, configured: false, walletAddress: "", message: "فشل الاتصال بالخادم" });
      });
  }, []);

  const handleSendPayment = function() {
    const targetUid = uid.trim();
    const amountVal = amount.trim();
    const memoVal = memo.trim();

    if (!targetUid) {
      toast({ title: "يرجى إدخال معرّف Pi للمستلم", variant: "destructive" });
      return;
    }
    if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) <= 0) {
      toast({ title: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setSending(true);

    // Add pending entry
    const pendingRecord: TestPaymentRecord = {
      uid: targetUid,
      amount: amountVal,
      memo: memoVal,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    setPayments(function(prev) { return [pendingRecord].concat(prev); });

    api.post("/api/pi/testnet-a2u", { amount: amountVal, uid: targetUid, memo: memoVal, simulate: simMode }, piUid)
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result) {
        setSending(false);
        if (result.ok && result.data.success) {
          // Update pending to completed
          setPayments(function(prev) {
            return prev.map(function(p) {
              if (p.uid === targetUid && p.timestamp === pendingRecord.timestamp && p.status === "pending") {
                return Object.assign({}, p, { status: "completed" as const });
              }
              return p;
            });
          });
          toast({
            title: "تم إرسال الدفعة بنجاح ✅",
            description: uniqueCount + 1 >= 5
              ? "تهانينا! تم استيفاء شرط الـ 5 محافظ المختلفة 🎉"
              : "تم الدفع لـ " + (uniqueCount + 1) + " من 5 محافظ مطلوبة",
          });
          setUid("");
        } else {
          // Update pending to failed
          setPayments(function(prev) {
            return prev.map(function(p) {
              if (p.uid === targetUid && p.timestamp === pendingRecord.timestamp && p.status === "pending") {
                return Object.assign({}, p, { status: "failed" as const, error: result.data.error || result.data.details || "خطأ غير معروف" });
              }
              return p;
            });
          });
          toast({ title: "فشل إرسال الدفعة", description: result.data.error || "خطأ غير معروف", variant: "destructive" });
        }
      })
      .catch(function() {
        setSending(false);
        setPayments(function(prev) {
          return prev.map(function(p) {
            if (p.uid === targetUid && p.timestamp === pendingRecord.timestamp && p.status === "pending") {
              return Object.assign({}, p, { status: "failed" as const, error: "خطأ في الاتصال" });
            }
            return p;
          });
        });
        toast({ title: "خطأ في الاتصال", variant: "destructive" });
      });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          إعداد Pi للشبكة الرئيسية
        </h2>
        {requirementMet && (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
            <CheckCircle2 className="h-3 w-3 ml-1" />
            الشرط مستوفى
          </Badge>
        )}
      </div>

      {/* Progress Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
            تقدّم شرط محفظة الشبكة الرئيسية
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">المدفوعات A2U لمحافظ مختلفة</span>
              <span className={"font-bold " + (requirementMet ? "text-emerald-600" : "text-amber-600")}>
                {uniqueCount} / 5
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">عنوان المحفظة</span>
              <span className="font-mono text-[10px] text-foreground max-w-[60%] truncate" dir="ltr">
                GDU525A3XNGZKTTHSKVAEFFYONRKITRFQZUTPZANO5V27N4TSL3A5CPS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الشبكة</span>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                Pi Testnet (Sandbox)
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحالة</span>
              {requirementMet ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">مستوفى ✓</Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">غير مستوفى</Badge>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            للتقديم على محفظة الشبكة الرئيسية في بوابة مطوري Pi، يجب إرسال مدفوعات A2U
            (من التطبيق إلى المستخدم) على شبكة الاختبار إلى <span className="font-bold text-foreground">5 محافظ (UIDs) مختلفة</span> على الأقل.
          </p>
        </CardContent>
      </Card>

      {/* Simulation Mode Banner */}
      {simMode && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">وضع المحاكاة نشط</p>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60">يتم تسجيل المدفوعات بدون اتصال فعلي بـ Pi API. أوقف المحاكاة عند التشغيل في متصفح Pi.</p>
          </div>
          <Button variant="outline" size="sm" className="text-[10px] shrink-0 h-7 border-amber-500/30 text-amber-600" onClick={function() { setSimMode(false); }}>
            إيقاف المحاكاة
          </Button>
        </div>
      )}

      {/* A2U Payment Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Send className="h-3.5 w-3.5 text-emerald-500" />
            إرسال دفعة اختبار A2U
            {!simMode && (
              <Button variant="ghost" size="sm" className="text-[10px] ml-auto h-6 text-amber-600 hover:text-amber-700" onClick={function() { setSimMode(true); }}>
                <Zap className="h-3 w-3 ml-1" />تفعيل المحاكاة
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">معرّف Pi للمستلم (UID)</Label>
            <Input
              value={uid}
              onChange={function(e) { setUid(e.target.value); }}
              placeholder="مثال: user_alphanumeric_uid"
              className="text-sm font-mono"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground">أدخل معرّف Pi فريد لكل دفعة — يجب أن يكونوا 5 معرّفات مختلفة</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">المبلغ (Pi)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={function(e) { setAmount(e.target.value); }}
              placeholder="0.01"
              className="text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الملاحظة (Memo)</Label>
            <Input
              value={memo}
              onChange={function(e) { setMemo(e.target.value); }}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleSendPayment}
            disabled={!uid.trim() || sending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            إرسال دفعة اختبار
          </Button>
        </CardContent>
      </Card>

      {/* Completed Transactions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
            المدفوعات المنفّذة
            <Badge variant="outline" className="text-[10px]">
              {completedPayments.length} دفعة — {uniqueCount} UID فريد
            </Badge>
            {payments.length > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] ml-auto h-6 text-red-400 hover:text-red-500" onClick={function() {
                api.delete("/api/pi/testnet-a2u", undefined, piUid).then(function() {
                  setPayments([]);
                  toast({ title: "تم مسح السجل" });
                }).catch(function() {});
              }}>
                <Trash2 className="h-3 w-3 ml-1" />مسح
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {payments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">لم يتم إرسال أي مدفوعات بعد</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {payments.map(function(p, idx) {
                return (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.status === "completed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : p.status === "pending" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-mono truncate" dir="ltr">{p.uid}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-600">{p.amount}π</span>
                      {p.status === "completed" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">مكتمل</Badge>
                      ) : p.status === "pending" ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">في الانتظار</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[9px]">فشل</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {uniqueCount > 0 && (
            <div className="mt-3 pt-2 border-t text-[10px] text-muted-foreground">
              <span className="font-medium">المعرّفات الفريدة:</span>{" "}
              {Array.from(uniqueUids).map(function(u, i) {
                return (
                  <span key={u} className="font-mono">
                    {i > 0 ? "، " : ""}{u.substring(0, 12)}...
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Completion Guide — for Pi Developer Portal */}
      <Card className="border-0 shadow-sm border-t-2 border-t-emerald-500/20">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
            دليل تعبئة نموذج بوابة المطورين
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            انسخ المحتوى التالي والصقه في نموذج التقديم على محفظة الشبكة الرئيسية في بوابة مطوري Pi.
          </p>

          {/* Reason for Applying */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-emerald-600">① سبب التقديم (Reason for applying)</Label>
            <div className="bg-muted/50 rounded-lg p-2.5 border border-emerald-500/10">
              <p className="text-[11px] text-foreground leading-relaxed" dir="ltr">
                Ledgererp is an invoice and escrow management platform on Pi Network. It enables merchants to create invoices, receive payments via Pi escrow (U2A), and release funds to sellers after delivery confirmation (A2U). A mainnet wallet is essential to process real A2U payments for escrow release, allowing sellers to receive Pi for completed transactions on the mainnet.
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={function() {
              copyText("Ledgererp is an invoice and escrow management platform on Pi Network. It enables merchants to create invoices, receive payments via Pi escrow (U2A), and release funds to sellers after delivery confirmation (A2U). A mainnet wallet is essential to process real A2U payments for escrow release, allowing sellers to receive Pi for completed transactions on the mainnet.", toast, "تم نسخ سبب التقديم");
            }}>
              <Copy className="h-3 w-3 ml-1" />نسخ النص
            </Button>
          </div>

          {/* Privacy Policy URL */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-emerald-600">② رابط سياسة الخصوصية (Privacy Policy URL)</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-muted/50 rounded-lg px-2.5 py-1.5 border border-emerald-500/10 truncate" dir="ltr">
                https://ledgererp.online/privacy-policy.html
              </code>
              <Button variant="outline" size="sm" className="text-[10px] h-7 shrink-0" onClick={function() {
                copyText("https://ledgererp.online/privacy-policy.html", toast, "تم نسخ رابط سياسة الخصوصية");
              }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <a href="/privacy-policy.html" target="_blank" className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline">
              <ExternalLink className="h-3 w-3" />معاينة الصفحة
            </a>
          </div>

          {/* Terms of Service URL */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-emerald-600">③ رابط شروط الخدمة (Terms of Service URL) — اختياري</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-muted/50 rounded-lg px-2.5 py-1.5 border border-emerald-500/10 truncate" dir="ltr">
                https://ledgererp.online/terms-of-service.html
              </code>
              <Button variant="outline" size="sm" className="text-[10px] h-7 shrink-0" onClick={function() {
                copyText("https://ledgererp.online/terms-of-service.html", toast, "تم نسخ رابط شروط الخدمة");
              }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <a href="/terms-of-service.html" target="_blank" className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline">
              <ExternalLink className="h-3 w-3" />معاينة الصفحة
            </a>
          </div>

          {/* Wallet Address */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-emerald-600">④ المحفظة (Wallet to use) — مملوء تلقائياً</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-muted/50 rounded-lg px-2.5 py-1.5 border border-emerald-500/10 truncate" dir="ltr">
                GDU525A3XNGZKTTHSKVAEFFYONRKITRFQZUTPZANO5V27N4TSL3A5CPS
              </code>
              <Button variant="outline" size="sm" className="text-[10px] h-7 shrink-0" onClick={function() {
                copyText("GDU525A3XNGZKTTHSKVAEFFYONRKITRFQZUTPZANO5V27N4TSL3A5CPS", toast, "تم نسخ عنوان المحفظة");
              }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="mt-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              ✅ بعد تعبئة جميع الحقول وإكمال شرط الـ 5 محافظ، اضغط <span className="font-bold">Submit</span> في بوابة المطورين.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="border-0 shadow-sm border-t-2 border-t-amber-500/20">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-amber-500" />
            خطوات استيفاء الشرط
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {[
            { step: 1, text: "افتح التطبيق في متصفح Pi على شبكة الاختبار (Testnet)" },
            { step: 2, text: "اجعل 5 مستخدمين Pi مختلفين يزورون التطبيق" },
            { step: 3, text: "استخدم النموذج أعلاه لإرسال مدفوعات A2U اختبارية إلى معرّف كل مستخدم" },
            { step: 4, text: "بعد الدفع لـ 5 معرّفات فريدة، عُد إلى بوابة مطوري Pi" },
            { step: 5, text: "قدّم طلب محفظة الشبكة الرئيسية (Mainnet Wallet)" },
          ].map(function(s) {
            return (
              <div key={s.step} className="flex items-start gap-2.5">
                <div className={"w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold " +
                  (s.step <= (requirementMet ? 4 : uniqueCount + 2) ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                  {s.step <= (requirementMet ? 4 : uniqueCount + 2) ? "✓" : s.step}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            );
          })}
          <div className="mt-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              💡 <span className="font-medium">ملاحظة:</span> المدفوعات تتم على شبكة الاختبار (Sandbox) وليس الشبكة الرئيسية.
              لا يتم خصم Pi حقيقي. استخدم API Key نفسه من ملف .env.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
