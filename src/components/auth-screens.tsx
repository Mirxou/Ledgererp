"use client";

import React from "react";
import { Shield, AlertTriangle, Loader2, Wallet, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

/* ═══ Full Page Loader ═══ */
export function FullPageLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield className="w-8 h-8 text-white animate-pulse" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/* ═══ Pi Browser Required ═══ */
export function PiBrowserRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
      <Card className="max-w-lg w-full border-0 shadow-2xl shadow-emerald-500/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">Ledgererp</h1>
            <p className="text-sm text-muted-foreground mt-1">منصة الفواتير والضمان الآمن</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-right space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>هذا التطبيق يعمل داخل متصفح Pi فقط</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يُرجى فتح هذا التطبيق من خلال متصفح Pi Network للحصول على تجربة كاملة تشمل المصادقة والدفع بالـ Pi.
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {[["إدارة الفواتير الذكية", FileText], ["ضمان آمن للمعاملات", Shield], ["دفع بالـ Pi مع حماية البائع والمشتري", Wallet]].map(function(t) {
              const Ic = t[1] as React.ElementType;
              return (
                <div key={t[0] as string} className="flex items-center gap-3 justify-end">
                  <span>{t[0] as string}</span>
                  <Ic className="h-4 w-4 text-emerald-500" />
                </div>
              );
            })}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">Ledgererp — تطبيق معتمد ضمن إيكوسيستم Pi Network</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══ Login Screen ═══ */
export function LoginScreen({ onLogin, loading, error }: { onLogin: () => void; loading: boolean; error: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-sm w-full border-0 shadow-xl">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Ledgererp</h1>
            <p className="text-xs text-muted-foreground mt-1">تسجيل الدخول للمتابعة</p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-600 dark:text-red-400 text-right">{error}</p>
            </div>
          )}
          <Button onClick={onLogin} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white h-11 text-sm font-medium">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4 ml-2" />}
            {loading ? "جارٍ الاتصال..." : "تسجيل الدخول عبر Pi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
