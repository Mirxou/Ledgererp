"use client";

import { useState, useMemo, useCallback } from "react";
import { usePiAuth } from "@/hooks/use-pi-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPiPayment, type PiPaymentData, type PiPaymentCallbacks } from "@/lib/pi-sdk";
import {
  ShoppingCart, FileText, Plus, Package, Store, Truck,
  CheckCircle2, Clock, XCircle, AlertTriangle, CreditCard,
  Receipt, BarChart3, Loader2, Shield, ArrowRightLeft,
  ChevronDown, ChevronUp, Wallet, Pencil, Trash2,
  FileCheck, Ban, CircleDot, Settings, Copy, Eye, Search, Send, LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

/* ═══ Types ═══ */
interface StoreData { id: string; piUid: string; name: string; description: string; avatar: string; isVerified: boolean; _count?: { products: number; invoices: number } }
interface ProductData { id: string; storeId: string; name: string; description: string; price: number; image: string; isActive: boolean; createdAt: string }
interface InvoiceItemData { id?: string; productId?: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }
interface InvoiceData {
  id: string; invoiceNumber: string; storeId: string;
  customerPiUid: string; customerName: string;
  subtotal: number; escrowFee: number; total: number;
  status: string; notes: string; paymentTxId: string; releaseTxId: string;
  createdAt: string; updatedAt: string;
  paidAt?: string | null; shippedAt?: string | null;
  deliveredAt?: string | null; completedAt?: string | null; cancelledAt?: string | null;
  items: InvoiceItemData[];
  store?: { name: string; piUid: string };
}

const ESCROW_FEE_RATE = 0.02;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:     { label: "في الانتظار",  color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",      icon: Clock },
  paid_escrow: { label: "في الضمان",    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",           icon: Shield },
  shipped:     { label: "تم الشحن",     color: "bg-purple-500/15 text-purple-600 border-purple-500/30",     icon: Truck },
  delivered:   { label: "تم التسليم",   color: "bg-teal-500/15 text-teal-600 border-teal-500/30",           icon: CheckCircle2 },
  completed:   { label: "مكتمل",        color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: FileCheck },
  disputed:    { label: "نزاع",         color: "bg-red-500/15 text-red-600 border-red-500/30",              icon: AlertTriangle },
  cancelled:   { label: "ملغى",         color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",           icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={s.color + " gap-1 font-medium text-[10px]"}>
      <Icon className="h-3 w-3" />{s.label}
    </Badge>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-DZ", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
}
function copyText(text: string, toast: ReturnType<typeof useToast>["toast"], label?: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: label || "تم النسخ" });
  });
}

/* ═══ Full Page Loader ═══ */
function FullPageLoader({ message }: { message: string }) {
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
function PiBrowserRequired() {
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
              let Ic = t[1];
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
function LoginScreen({ onLogin, loading, error }: { onLogin: () => void; loading: boolean; error: string | null }) {
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

/* ═══ App Entry ═══ */
export default function LedgererpApp() {
  let auth = usePiAuth();

  if (auth.loading && !auth.sdkReady && !auth.notPiBrowser) return <FullPageLoader message="جارٍ تهيئة التطبيق..." />;
  if (auth.notPiBrowser) return <PiBrowserRequired />;
  if (auth.loading) return <FullPageLoader message="جارٍ الاتصال بشبكة Pi..." />;
  if (!auth.connected || !auth.user) return <LoginScreen onLogin={auth.login} loading={auth.loading} error={auth.error} />;

  return <AuthenticatedApp piUid={auth.user.uid} username={auth.user.username} />;
}

/* ═══ Authenticated Shell ═══ */
function AuthenticatedApp({ piUid, username }: { piUid: string; username: string }) {
  let qc = useQueryClient();
  let toast = useToast().toast;
  let activeTab = useState("dashboard");
  let tab = activeTab[0];
  let setTab = activeTab[1];

  /* Store */
  let storeState = useState<StoreData | null>(null);
  let createdStore = storeState[0];
  let setCreatedStore = storeState[1];

  let storesRes = useQuery({
    queryKey: ["stores"],
    queryFn: function() { return fetch("/api/stores").then(function(r) { return r.json(); }); },
  });
  let stores = storesRes.data as StoreData[] | undefined;

  let myStore = useMemo(function() {
    if (createdStore) return createdStore;
    if (stores) {
      for (let i = 0; i < stores.length; i++) {
        if (stores[i].piUid === piUid) return stores[i];
      }
    }
    return null;
  }, [createdStore, stores, piUid]);

  /* Invoices */
  let merchantInvRes = useQuery({
    queryKey: ["invoices", "merchant", myStore ? myStore.id : ""],
    queryFn: function() { return fetch("/api/invoices?storeId=" + myStore!.id).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
  });
  let customerInvRes = useQuery({
    queryKey: ["invoices", "customer", piUid],
    queryFn: function() { return fetch("/api/invoices?customerPiUid=" + piUid).then(function(r) { return r.json(); }); },
  });

  /* Products */
  let productsRes = useQuery({
    queryKey: ["products", myStore ? myStore.id : ""],
    queryFn: function() { return fetch("/api/products?storeId=" + myStore!.id).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
  });

  /* Mutations */
  let createStoreMut = useMutation({
    mutationFn: function(data: { piUid: string; name: string; description: string; avatar?: string }) {
      return fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function(r) { return r.json(); });
    },
    onSuccess: function(data) { setCreatedStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم إنشاء المتجر بنجاح" }); },
    onError: function() { toast({ title: "فشل إنشاء المتجر", variant: "destructive" }); },
  });

  let updateStoreMut = useMutation({
    mutationFn: function(data: { id: string; name?: string; description?: string; avatar?: string }) {
      return fetch("/api/stores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function(r) { return r.json(); });
    },
    onSuccess: function() { qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم تحديث المتجر" }); },
    onError: function() { toast({ title: "فشل التحديث", variant: "destructive" }); },
  });

  let deleteStoreMut = useMutation({
    mutationFn: function(id: string) {
      return fetch("/api/stores", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }) }).then(function(r) { return r.json(); });
    },
    onSuccess: function() { setCreatedStore(null); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم حذف المتجر" }); },
    onError: function() { toast({ title: "فشل الحذف", variant: "destructive" }); },
  });

  let updateInvoiceMut = useMutation({
    mutationFn: function(data: { id: string; status: string; paymentTxId?: string; releaseTxId?: string }) {
      return fetch("/api/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function(r) { return r.json(); });
    },
    onSuccess: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  /* Stats */
  let stats = useMemo(function() {
    let mi = (merchantInvRes.data || []) as InvoiceData[];
    let ci = (customerInvRes.data || []) as InvoiceData[];
    let escrowed = mi.filter(function(inv) { return ["paid_escrow", "shipped", "delivered"].indexOf(inv.status) !== -1; });
    let disputed = mi.filter(function(inv) { return inv.status === "disputed"; });
    let cancelled = mi.filter(function(inv) { return inv.status === "cancelled"; });
    return {
      totalInvoices: mi.length,
      totalProducts: (productsRes.data || []).length,
      escrowedPi: escrowed.reduce(function(s, inv) { return s + inv.total; }, 0),
      completedPi: mi.filter(function(inv) { return inv.status === "completed"; }).reduce(function(s, inv) { return s + inv.subtotal; }, 0),
      myOrders: ci.length,
      disputedCount: disputed.length,
      cancelledCount: cancelled.length,
      recentOrders: mi.slice(0, 5),
    };
  }, [merchantInvRes.data, customerInvRes.data, productsRes.data]);

  /* Pay with Pi (U2A) */
  let payWithPi = useCallback(function(invoice: InvoiceData) {
    let callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: function(paymentId) {
        fetch("/api/pi_payment/approve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: paymentId, invoiceId: invoice.id }),
        }).catch(function() { toast({ title: "فشل الموافقة على الدفعة", variant: "destructive" }); });
      },
      onReadyForServerCompletion: function(paymentId, txid) {
        fetch("/api/pi_payment/complete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: paymentId, txid: txid, invoiceId: invoice.id }),
        }).then(function() {
          qc.invalidateQueries({ queryKey: ["invoices"] });
          toast({ title: "تم الدفع بنجاح! الأموال في الضمان" });
        }).catch(function() { toast({ title: "فشل إكمال الدفعة", variant: "destructive" }); });
      },
      onCancel: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم إلغاء الدفع" }); },
      onError: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "خطأ في الدفع", variant: "destructive" }); },
    };
    let paymentData: PiPaymentData = {
      amount: invoice.total,
      memo: "فاتورة " + invoice.invoiceNumber + " — " + (invoice.store ? invoice.store.name : "Ledgererp"),
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
    createPiPayment(paymentData, callbacks);
  }, [qc, toast]);

  /* A2U Release Pi to seller */
  let handleRelease = useCallback(function(invoice: InvoiceData) {
    if (!myStore) return;
    toast({ title: "جارٍ إطلاق الأموال..." });
    fetch("/api/pi/a2u", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: String(invoice.subtotal),
        uid: myStore.piUid,
        memo: "إطلاق ضمان فاتورة " + invoice.invoiceNumber,
        metadata: { invoiceId: invoice.id, type: "escrow_release" },
        invoiceId: invoice.id,
      }),
    }).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        toast({ title: "تم إطلاق الأموال للبائع بنجاح ✅" });
      } else {
        return res.json().catch(function() { return {}; });
      }
    }).then(function(err) {
      if (err && err.error) toast({ title: "فشل الإطلاق", description: err.error, variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  }, [myStore, qc, toast]);

  let handleShip = function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "shipped" }); toast({ title: "تم تحديث الحالة: تم الشحن" }); };
  let handleConfirm = function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "delivered" }); toast({ title: "تم تأكيد التسليم" }); };
  let handleDispute = function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "disputed" }); toast({ title: "تم فتح نزاع" }); };
  let handleCancel = function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "cancelled" }); toast({ title: "تم إلغاء الطلب" }); };

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-bold text-base tracking-tight">Ledgererp</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CircleDot className="h-3 w-3" />{username}
            </Badge>
            <button className="p-1.5 rounded-md hover:bg-muted" onClick={function() { copyText(piUid, toast, "تم نسخ المعرف"); }}>
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">
        {storesRes.isLoading && !myStore ? (
          <div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full rounded-xl" /></div>
        ) : !myStore ? (
          <StoreSetup onCreate={function(n, d, a) { createStoreMut.mutate({ piUid: piUid, name: n, description: d, avatar: a }); }} loading={createStoreMut.isPending} />
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-5">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50">
              {[["dashboard", BarChart3, "الرئيسية"], ["products", Package, "المنتجات"], ["invoices", FileText, "الفواتير"], ["orders", ShoppingCart, "الطلبات"], ["settings", Settings, "الإعدادات"]].map(function(t) {
              let Ic = t[1];
                return (
                  <TabsTrigger key={t[0] as string} value={t[0] as string} className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1">
                    <Ic className="h-3.5 w-3.5" /><span className="hidden xs:inline">{t[2] as string}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="dashboard"><DashboardView stats={stats} store={myStore} /></TabsContent>
            <TabsContent value="products"><ProductsView products={(productsRes.data || []) as ProductData[]} storeId={myStore.id} /></TabsContent>
            <TabsContent value="invoices"><InvoicesView store={myStore} products={(productsRes.data || []) as ProductData[]} /></TabsContent>
            <TabsContent value="orders">
              <OrdersView
                merchantInvoices={(merchantInvRes.data || []) as InvoiceData[]}
                customerInvoices={(customerInvRes.data || []) as InvoiceData[]}
                store={myStore} customerUid={piUid}
                onPay={payWithPi} onShip={handleShip}
                onConfirmDelivery={handleConfirm} onRelease={handleRelease}
                onDispute={handleDispute} onCancel={handleCancel}
              />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsView store={myStore} onUpdate={function(d) { updateStoreMut.mutate(d); }} onDelete={function() { deleteStoreMut.mutate(myStore.id); }} updating={updateStoreMut.isPending} deleting={deleteStoreMut.isPending} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-3 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ledgererp — منصة الفواتير والضمان الآمن</span>
          <span>v2.0</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══ Store Setup ═══ */
function StoreSetup({ onCreate, loading }: { onCreate: (name: string, desc: string, avatar: string) => void; loading: boolean }) {
  let nameState = useState("");
  let descState = useState("");
  let avatarState = useState("");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-lg">مرحباً بك في Ledgererp</CardTitle>
          <CardDescription className="text-xs">أنشئ متجرك لبدء إصدار الفواتير واستقبال المدفوعات بالـ Pi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={nameState[0]} onChange={function(e) { nameState[1](e.target.value); }} placeholder="مثال: متجر الإلكترونيات" className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">وصف المتجر</Label><Textarea value={descState[0]} onChange={function(e) { descState[1](e.target.value); }} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5"><Label className="text-xs">رابط الصورة (اختياري)</Label><Input value={avatarState[0]} onChange={function(e) { avatarState[1](e.target.value); }} placeholder="https://..." className="text-sm" dir="ltr" /></div>
          <Button onClick={function() { if (nameState[0].trim()) onCreate(nameState[0].trim(), descState[0].trim(), avatarState[0].trim()); }} disabled={!nameState[0].trim() || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            إنشاء المتجر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══ Dashboard ═══ */
function DashboardView({ stats, store }: { stats: Record<string, unknown>; store: StoreData }) {
  let cards = [
    { label: "إجمالي الفواتير", value: String(stats.totalInvoices), icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المنتجات", value: String(stats.totalProducts), icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "π في الضمان", value: Number(stats.escrowedPi || 0).toFixed(2), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "π مكتمل", value: Number(stats.completedPi || 0).toFixed(2), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];
  let recent = (stats.recentOrders || []) as InvoiceData[];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{store.name}</h2>
          <p className="text-xs text-muted-foreground">{store.description || "متجرك على Ledgererp"}</p>
        </div>
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><Store className="h-3 w-3 ml-1" />نشط</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(function(c) {
          return (
            <Card key={c.label} className="border-0 shadow-sm">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={"w-9 h-9 rounded-xl " + c.bg + " flex items-center justify-center shrink-0"}><c.icon className={"h-4 w-4 " + c.color} /></div>
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">{c.label}</p><p className="font-bold text-base leading-tight">{c.value}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Escrow Flow */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />مسار الضمان</CardTitle></CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-around text-[10px] gap-1">
            {[["إنشاء", FileText, "text-slate-500 bg-slate-100 dark:bg-slate-800"], ["دفع", CreditCard, "text-blue-500 bg-blue-50 dark:bg-blue-950/50"], ["شحن", Truck, "text-purple-500 bg-purple-50 dark:bg-purple-950/50"], ["تسليم", CheckCircle2, "text-teal-500 bg-teal-50 dark:bg-teal-950/50"], ["إطلاق", Wallet, "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"]].map(function(step, i, arr) {
              let StepIcon = step[1];
              return (
                <div key={step[0]} className="flex items-center gap-1 shrink-0">
                  <div className={"w-7 h-7 rounded-lg " + step[2] + " flex items-center justify-center"}><StepIcon className="h-3.5 w-3.5" /></div>
                  <span className="text-muted-foreground whitespace-nowrap hidden sm:block">{step[0]}</span>
                  {i < arr.length - 1 && <ChevronDown className="h-3 w-3 text-muted-foreground/30 hidden sm:block" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-emerald-500" />آخر الطلبات</CardTitle></CardHeader>
          <CardContent className="pb-3 px-4 space-y-2">
            {recent.map(function(inv) {
              return (
                <div key={inv.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs truncate">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{inv.customerName || inv.customerPiUid}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={inv.status} />
                    <span className="text-[11px] font-semibold text-emerald-600">{inv.total.toFixed(2)}π</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══ Products ═══ */
function ProductsView({ products, storeId }: { products: ProductData[]; storeId: string }) {
  let qc = useQueryClient();
  let toast = useToast().toast;
  let openState = useState(false);
  let editState = useState(false);
  let formState = useState({ name: "", description: "", price: "" });
  let editFormState = useState<ProductData | null>(null);
  let savingState = useState(false);
  let searchState = useState("");

  let handleAdd = function() {
    if (!formState[0].name.trim() || !formState[0].price) return;
    savingState[1](true);
    fetch("/api/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: storeId, name: formState[0].name.trim(), description: formState[0].description.trim(), price: parseFloat(formState[0].price) || 0 }),
    }).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); openState[1](false); formState[1]({ name: "", description: "", price: "" }); toast({ title: "تم إضافة المنتج" }); }
      else toast({ title: "فشل الإضافة", variant: "destructive" });
    }).finally(function() { savingState[1](false); });
  };

  let handleEdit = function() {
    if (!editFormState[0] || !editFormState[0].name.trim()) return;
    savingState[1](true);
    let ef = editFormState[0];
    fetch("/api/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ef.id, name: ef.name.trim(), description: ef.description.trim(), price: ef.price, isActive: ef.isActive }),
    }).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); editState[1](false); editFormState[1](null); toast({ title: "تم تحديث المنتج" }); }
      else toast({ title: "فشل التحديث", variant: "destructive" });
    }).finally(function() { savingState[1](false); });
  };

  let handleDelete = function(id: string) {
    fetch("/api/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }),
    }).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "تم حذف المنتج" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    });
  };

  let handleToggle = function(p: ProductData) {
    fetch("/api/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    }).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: p.isActive ? "تم تعطيل المنتج" : "تم تفعيل المنتج" }); }
    });
  };

  let filtered = searchState[0] ? products.filter(function(p) { return p.name.indexOf(searchState[0]) !== -1; }) : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={searchState[0]} onChange={function(e) { searchState[1](e.target.value); }} placeholder="بحث عن منتج..." className="text-sm pr-9" /></div>
        <Dialog open={openState[0]} onOpenChange={openState[1]}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />إضافة</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle className="text-sm">منتج جديد</DialogTitle><DialogDescription className="text-xs">أضف منتجاً لمتجرك</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={formState[0].name} onChange={function(e) { formState[1](Object.assign({}, formState[0], { name: e.target.value })); }} placeholder="اسم المنتج" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={formState[0].description} onChange={function(e) { formState[1](Object.assign({}, formState[0], { description: e.target.value })); }} placeholder="وصف مختصر" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={formState[0].price} onChange={function(e) { formState[1](Object.assign({}, formState[0], { price: e.target.value })); }} placeholder="0.00" className="text-sm" dir="ltr" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={!formState[0].name.trim() || !formState[0].price || savingState[0]} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{savingState[0] ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد منتجات</p><p className="text-xs mt-1">أضف منتجاتك لبدء إنشاء الفواتير</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(function(p) {
            return (
              <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={function() { editFormState[1](Object.assign({}, p)); editState[1](true); }}>
                      <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description || "بدون وصف"}</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shrink-0 mr-2">{p.price} π</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <button onClick={function() { handleToggle(p); }} className={"text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer" + (p.isActive ? " border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : " border-zinc-500/30 text-zinc-500 bg-zinc-500/10")}>
                      {p.isActive ? "نشط" : "معطّل"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={function() { editFormState[1](Object.assign({}, p)); editState[1](true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <AlertDialog><AlertDialogTrigger asChild><button className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتج</AlertDialogTitle><AlertDialogDescription className="text-xs">هل أنت متأكد؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { handleDelete(p.id); }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editState[0]} onOpenChange={editState[1]}>
        <DialogContent><DialogHeader><DialogTitle className="text-sm">تعديل المنتج</DialogTitle><DialogDescription className="text-xs">عدّل بيانات المنتج</DialogDescription></DialogHeader>
          {editFormState[0] && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={editFormState[0].name} onChange={function(e) { editFormState[1](Object.assign({}, editFormState[0], { name: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={editFormState[0].description} onChange={function(e) { editFormState[1](Object.assign({}, editFormState[0], { description: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" value={editFormState[0].price} onChange={function(e) { editFormState[1](Object.assign({}, editFormState[0], { price: parseFloat(e.target.value) || 0 })); }} className="text-sm" dir="ltr" /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">حالة النشر</Label><Switch checked={editFormState[0].isActive} onCheckedChange={function(v) { editFormState[1](Object.assign({}, editFormState[0], { isActive: v })); }} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEdit} disabled={!editFormState[0] || !editFormState[0].name.trim() || savingState[0]} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{savingState[0] ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══ Invoices ═══ */
function InvoicesView({ store, products }: { store: StoreData; products: ProductData[] }) {
  let qc = useQueryClient();
  let toast = useToast().toast;
  let openState = useState(false);
  let nameState = useState("");
  let uidState = useState("");
  let notesState = useState("");
  let savingState = useState(false);
  let itemsState = useState([{ productName: "", quantity: 1, unitPrice: 0 }]);
  let detailState = useState<InvoiceData | null>(null);

  let items = itemsState[0];
  let setItems = itemsState[1];

  let addItem = function() { setItems(items.concat([{ productName: "", quantity: 1, unitPrice: 0 }])); };
  let removeItem = function(idx: number) { setItems(items.filter(function(_, i) { return i !== idx; })); };
  let updateItem = function(idx: number, field: string, value: string | number) {
    let u = items.map(function(item, i) { if (i === idx) { let copy = Object.assign({}, item); (copy as Record<string, unknown>)[field] = value; return copy; } return item; });
    setItems(u);
  };

  let subtotal = items.reduce(function(s, i) { return s + i.unitPrice * i.quantity; }, 0);
  let escrowFee = subtotal * ESCROW_FEE_RATE;
  let total = subtotal + escrowFee;
  let canCreate = uidState[0].trim() !== "" && items.some(function(i) { return i.productName && i.unitPrice > 0; });

  let handleCreate = function() {
    if (!canCreate) return;
    savingState[1](true);
    fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, customerPiUid: uidState[0].trim(), customerName: nameState[0].trim(), items: items, notes: notesState[0], escrowFee: escrowFee }),
    }).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        openState[1](false); nameState[1](""); uidState[1](""); notesState[1]("");
        setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
        toast({ title: "تم إنشاء الفاتورة" });
      } else toast({ title: "فشل إنشاء الفاتورة", variant: "destructive" });
    }).finally(function() { savingState[1](false); });
  };

  let invRes = useQuery({
    queryKey: ["invoices", "merchant", store.id],
    queryFn: function() { return fetch("/api/invoices?storeId=" + store.id).then(function(r) { return r.json(); }); },
  });
  let invoiceList = (invRes.data || []) as InvoiceData[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">الفواتير <span className="text-muted-foreground font-normal text-xs">({invoiceList.length})</span></h2>
        <Dialog open={openState[0]} onOpenChange={openState[1]}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Plus className="h-3.5 w-3.5 ml-1.5" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">فاتورة جديدة</DialogTitle><DialogDescription className="text-xs">إنشاء فاتورة مع ضمان الدفع</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">اسم المشتري</Label><Input value={nameState[0]} onChange={function(e) { nameState[1](e.target.value); }} placeholder="اختياري" className="text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">UID المشتري *</Label><Input value={uidState[0]} onChange={function(e) { uidState[1](e.target.value); }} placeholder="من Pi" className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">المنتجات</Label>{items.length < 10 && <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600"><Plus className="h-3 w-3 ml-1" />إضافة</Button>}</div>
                <div className="space-y-2">
                  {items.map(function(item, idx) {
                    let activeProducts = products.filter(function(p) { return p.isActive; });
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_48px_68px_28px] gap-1.5 items-end">
                        <div>
                          {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                          {idx === 0 ? (
                            <Input value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); }} placeholder="اسم المنتج" className="text-xs h-8" />
                          ) : (
                            <select value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); let found = null; for (let k = 0; k < activeProducts.length; k++) { if (activeProducts[k].name === e.target.value) { found = activeProducts[k]; break; } } if (found) updateItem(idx, "unitPrice", found.price); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                              <option value="">اختر</option>
                              {activeProducts.map(function(p) { return <option key={p.id} value={p.name}>{p.name} — {p.price}π</option>; })}
                            </select>
                          )}
                        </div>
                        <div>{idx === 0 && <span className="text-[10px] text-muted-foreground">الكمية</span>}<Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={function(e) { updateItem(idx, "quantity", parseInt(e.target.value) || 1); }} className="text-xs h-8 text-center" /></div>
                        <div>{idx === 0 && <span className="text-[10px] text-muted-foreground">السعر</span>}<Input type="number" step="0.01" value={item.unitPrice} onChange={function(e) { updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0); }} className="text-xs h-8" dir="ltr" /></div>
                        <Button variant="ghost" size="sm" onClick={function() { removeItem(idx); }} className="h-8 w-8 p-0 text-destructive" disabled={items.length <= 1}><XCircle className="h-3.5 w-3.5" /></Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={notesState[0]} onChange={function(e) { notesState[1](e.target.value); }} placeholder="اختياري..." className="text-sm min-h-[56px]" /></div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} π</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)</span><span>{escrowFee.toFixed(2)} π</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{total.toFixed(2)} π</span></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!canCreate || savingState[0]} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{savingState[0] ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}إنشاء</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invoiceList.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد فواتير</p></CardContent></Card>
      ) : (
        <div className="space-y-2.5">
          {invoiceList.map(function(inv) {
            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 space-y-2 cursor-pointer" onClick={function() { detailState[1](inv); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.customerName || inv.customerPiUid} · {fmtDate(inv.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0"><StatusBadge status={inv.status} /><p className="text-[11px] font-bold mt-0.5 text-emerald-600">{inv.total.toFixed(2)} π</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailState[0]} onOpenChange={function(open) { if (!open) detailState[1](null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailState[0] && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle className="text-sm">{detailState[0].invoiceNumber}</DialogTitle><DialogDescription className="text-xs">{fmtDate(detailState[0].createdAt)} — {detailState[0].customerName || detailState[0].customerPiUid}</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2"><StatusBadge status={detailState[0].status} /><span className="text-sm font-bold text-emerald-600">{detailState[0].total.toFixed(2)} π</span></div>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
                {detailState[0].items.map(function(item, i) {
                  return (
                    <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate max-w-[50%]">{item.productName}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {item.unitPrice.toFixed(2)}π = <span className="font-medium text-foreground">{item.totalPrice.toFixed(2)}π</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{detailState[0].subtotal.toFixed(2)} π</span></div>
                {detailState[0].escrowFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم الضمان</span><span>{detailState[0].escrowFee.toFixed(2)} π</span></div>}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold"><span>الإجمالي</span><span className="text-emerald-600">{detailState[0].total.toFixed(2)} π</span></div>
              </div>
              {detailState[0].notes && <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2"><span className="font-medium">ملاحظات:</span> {detailState[0].notes}</div>}
              {detailState[0].paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الدفع: {detailState[0].paymentTxId}</div>}
              {detailState[0].releaseTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الإطلاق: {detailState[0].releaseTxId}</div>}
              {/* Timeline */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">تاريخ الحالة</p>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">إنشاء</span><span>{fmtDate(detailState[0].createdAt)} {fmtTime(detailState[0].createdAt)}</span></div>
                  {detailState[0].paidAt && <div className="flex justify-between"><span className="text-blue-500">دفع الضمان</span><span>{fmtDate(detailState[0].paidAt)} {fmtTime(detailState[0].paidAt)}</span></div>}
                  {detailState[0].shippedAt && <div className="flex justify-between"><span className="text-purple-500">شحن</span><span>{fmtDate(detailState[0].shippedAt)} {fmtTime(detailState[0].shippedAt)}</span></div>}
                  {detailState[0].deliveredAt && <div className="flex justify-between"><span className="text-teal-500">تسليم</span><span>{fmtDate(detailState[0].deliveredAt)} {fmtTime(detailState[0].deliveredAt)}</span></div>}
                  {detailState[0].completedAt && <div className="flex justify-between"><span className="text-emerald-500">إكمال</span><span>{fmtDate(detailState[0].completedAt)} {fmtTime(detailState[0].completedAt)}</span></div>}
                  {detailState[0].cancelledAt && <div className="flex justify-between"><span className="text-zinc-500">إلغاء</span><span>{fmtDate(detailState[0].cancelledAt)} {fmtTime(detailState[0].cancelledAt)}</span></div>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={function() { copyText(detailState[0]!.invoiceNumber, toast, "تم نسخ رقم الفاتورة"); }}><Copy className="h-3 w-3 ml-1" />نسخ الرقم</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══ Orders ═══ */
function OrdersView({ merchantInvoices, customerInvoices, store, customerUid, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel }: {
  merchantInvoices: InvoiceData[]; customerInvoices: InvoiceData[];
  store: StoreData; customerUid: string;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
}) {
  let viewState = useState<string>("merchant");
  let view = viewState[0];
  let filterState = useState("");
  let invoices = view === "merchant" ? merchantInvoices : customerInvoices;
  let filtered = filterState[0] ? invoices.filter(function(inv) { return inv.status === filterState[0]; }) : invoices;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-base shrink-0">الطلبات</h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg border p-0.5 bg-muted/50">
            <button onClick={function() { viewState[1]("merchant"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "merchant" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><Store className="h-3 w-3 inline ml-1" />بائع</button>
            <button onClick={function() { viewState[1]("customer"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "customer" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><ShoppingCart className="h-3 w-3 inline ml-1" />مشتري</button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد طلبات</p></CardContent></Card>
      ) : (
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
          {filtered.map(function(inv) {
            return (
              <OrderCard key={inv.id} invoice={inv} view={view} store={store} onPay={onPay} onShip={onShip} onConfirmDelivery={onConfirmDelivery} onRelease={onRelease} onDispute={onDispute} onCancel={onCancel} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({ invoice: inv, view, store, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel }: {
  invoice: InvoiceData; view: string; store: StoreData;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
}) {
  let expandedState = useState(false);
  let expanded = expandedState[0];
  let loadingState = useState(false);

  let canPay = view === "customer" && inv.status === "pending";
  let canShip = view === "merchant" && inv.status === "paid_escrow";
  let canConfirm = view === "customer" && inv.status === "shipped";
  let canRelease = view === "merchant" && inv.status === "delivered";
  let canDispute = view === "customer" && (inv.status === "paid_escrow" || inv.status === "shipped");
  let canCancel = inv.status === "pending";

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="font-semibold text-xs truncate">{inv.invoiceNumber}</p>
              <p className="text-[10px] text-muted-foreground">{view === "merchant" ? (inv.customerName || inv.customerPiUid) : (inv.store ? inv.store.name : "—")} · {fmtDate(inv.createdAt)}</p>
            </div>
          </div>
          <div className="text-left shrink-0"><StatusBadge status={inv.status} /><p className="text-xs font-bold mt-0.5 text-emerald-600">{inv.total.toFixed(2)} π</p></div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Package className="h-3 w-3" /><span>{inv.items ? inv.items.length : 0} منتج</span><span>·</span><span>{inv.subtotal.toFixed(2)} π</span>
          {inv.escrowFee > 0 && <><span>·</span><span>ضمان {inv.escrowFee.toFixed(2)} π</span></>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canPay && <ActionBtn icon={<CreditCard className="h-3 w-3 ml-1" />} label="دفع بالـ Pi" onClick={function() { onPay(inv); }} primary />}
          {canShip && <ActionBtn icon={<Truck className="h-3 w-3 ml-1" />} label="شحن" onClick={function() { onShip(inv); }} outline="border-blue-500/30 text-blue-600" />}
          {canConfirm && <ActionBtn icon={<CheckCircle2 className="h-3 w-3 ml-1" />} label="تأكيد التسليم" onClick={function() { onConfirmDelivery(inv); }} outline="border-teal-500/30 text-teal-600" />}
          {canRelease && <ActionBtn icon={<Wallet className="h-3 w-3 ml-1" />} label="إطلاق Pi" onClick={function() { loadingState[1](true); onRelease(inv); loadingState[1](false); }} primary loading={loadingState[0]} />}
          {canDispute && <ActionBtn icon={<AlertTriangle className="h-3 w-3 ml-1" />} label="فتح نزاع" onClick={function() { onDispute(inv); }} outline="border-red-500/30 text-red-500" />}
          {canCancel && (
            <AlertDialog><AlertDialogTrigger asChild><ActionBtn icon={<Ban className="h-3 w-3 ml-1" />} label="إلغاء" outline="border-red-500/30 text-red-500" /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">إلغاء الطلب</AlertDialogTitle><AlertDialogDescription className="text-xs">هل تريد إلغاء هذا الطلب؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">لا</AlertDialogCancel><AlertDialogAction onClick={function() { onCancel(inv); }} className="text-xs bg-red-600 hover:bg-red-700">نعم، إلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={function() { expandedState[1](!expanded); }} className="h-7 px-2 text-[11px] text-muted-foreground mr-auto rounded-md hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}التفاصيل
          </button>
        </div>

        {expanded && (
          <div className="border-t pt-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
            {inv.items && inv.items.map(function(item, i) {
              return (
                <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-foreground truncate max-w-[50%]">{item.productName}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {item.unitPrice.toFixed(2)}π = <span className="font-medium text-foreground">{item.totalPrice.toFixed(2)}π</span></span>
                </div>
              );
            })}
            {inv.notes && <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1"><span className="font-medium">ملاحظات:</span> {inv.notes}</div>}
            {inv.paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/50 rounded-lg p-1.5 mt-1 break-all" dir="ltr">TX: {inv.paymentTxId}</div>}
            {/* Status timeline */}
            <div className="text-[10px] space-y-0.5 mt-2 pt-2 border-t">
              <div className="flex justify-between"><span className="text-muted-foreground">إنشاء</span><span>{fmtDate(inv.createdAt)} {fmtTime(inv.createdAt)}</span></div>
              {inv.paidAt && <div className="flex justify-between"><span className="text-blue-500">في الضمان</span><span>{fmtDate(inv.paidAt)} {fmtTime(inv.paidAt)}</span></div>}
              {inv.shippedAt && <div className="flex justify-between"><span className="text-purple-500">تم الشحن</span><span>{fmtDate(inv.shippedAt)} {fmtTime(inv.shippedAt)}</span></div>}
              {inv.deliveredAt && <div className="flex justify-between"><span className="text-teal-500">تم التسليم</span><span>{fmtDate(inv.deliveredAt)} {fmtTime(inv.deliveredAt)}</span></div>}
              {inv.completedAt && <div className="flex justify-between"><span className="text-emerald-500">مكتمل</span><span>{fmtDate(inv.completedAt)} {fmtTime(inv.completedAt)}</span></div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionBtn({ icon, label, onClick, primary, outline, loading }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean; outline?: string; loading?: boolean }) {
  if (primary) {
    return <Button size="sm" onClick={onClick} disabled={loading} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">{loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : icon}{label}</Button>;
  }
  return <Button size="sm" variant="outline" onClick={onClick} className={"h-7 text-[11px] " + (outline || "")}>{icon}{label}</Button>;
}

/* ═══ Settings ═══ */
function SettingsView({ store, onUpdate, onDelete, updating, deleting }: {
  store: StoreData; onUpdate: (d: { id: string; name?: string; description?: string; avatar?: string }) => void;
  onDelete: () => void; updating: boolean; deleting: boolean;
}) {
  let nameState = useState(store.name);
  let descState = useState(store.description);
  let savedState = useState(false);

  let handleSave = function() {
    onUpdate({ id: store.id, name: nameState[0].trim(), description: descState[0].trim() });
    savedState[1](true);
    setTimeout(function() { savedState[1](false); }, 2000);
  };

  let toast = useToast().toast;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="font-bold text-base">الإعدادات</h2>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Store className="h-3.5 w-3.5 text-emerald-500" />معلومات المتجر</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={nameState[0]} onChange={function(e) { nameState[1](e.target.value); savedState[1](false); }} className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={descState[0]} onChange={function(e) { descState[1](e.target.value); savedState[1](false); }} className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">معرّف Pi (UID)</Label>
            <div className="flex items-center gap-2">
              <Input value={store.piUid} readOnly className="text-xs font-mono bg-muted/50" dir="ltr" />
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={function() { copyText(store.piUid, toast, "تم نسخ المعرف"); }}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updating || savedState[0]} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : savedState[0] ? <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}
            {savedState[0] ? "تم الحفظ" : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-500" />حول التطبيق</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>الإصدار</span><span className="font-mono text-foreground">2.0.0</span></div>
          <div className="flex justify-between"><span>الشبكة</span><Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Pi Mainnet</Badge></div>
          <div className="flex justify-between"><span>المنتجات النشطة</span><span className="text-foreground">{store._count ? store._count.products : "—"}</span></div>
          <div className="flex justify-between"><span>إجمالي الفواتير</span><span className="text-foreground">{store._count ? store._count.invoices : "—"}</span></div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm border-t-2 border-t-red-500/20">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold text-red-500 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3" />منطقة الخطر</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">حذف المتجر سيحذف جميع المنتجات والفواتير. لا يمكن التراجع.</p>
          <AlertDialog><AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={deleting} className="text-xs border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Trash2 className="h-3.5 w-3.5 ml-1.5" />}حذف المتجر
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">هل أنت متأكد تماماً؟</AlertDialogTitle><AlertDialogDescription className="text-xs">سيتم حذف &quot;{store.name}&quot; وجميع بياناته نهائياً.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="text-xs bg-red-600 hover:bg-red-700">نعم، احذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
