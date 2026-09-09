"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { usePiAuth } from "@/hooks/use-pi-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPiPayment, type PiPaymentData, type PiPaymentCallbacks } from "@/lib/pi-sdk";
import { api, setAccessToken } from "@/lib/api-client";
import {
  ShoppingCart, FileText, Plus, Package, Store, Truck,
  CheckCircle2, Clock, XCircle, AlertTriangle, CreditCard,
  Receipt, BarChart3, Loader2, Shield, ArrowRightLeft,
  ChevronDown, ChevronUp, Wallet, Pencil, Trash2,
  FileCheck, Ban, CircleDot, Settings, Copy, Eye, Search, Send, LogOut,
  Zap, Info, CheckCircle, ExternalLink,
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
import { Progress } from "@/components/ui/progress";

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
const DEMO_MODE = process.env.NODE_ENV === "development";
const DEMO_USER = { uid: "demo_uid_12345", username: "demo_user" };

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
  const auth = usePiAuth();

  // Store Pi access token for API auth
  useEffect(function() {
    if (auth.user?.accessToken) {
      setAccessToken(auth.user.accessToken);
    }
  }, [auth.user]);

  // In demo/dev mode, bypass Pi Browser check
  if (DEMO_MODE) {
    return <AuthenticatedApp piUid={DEMO_USER.uid} username={DEMO_USER.username} />;
  }

  if (auth.loading && !auth.sdkReady && !auth.notPiBrowser) return <FullPageLoader message="جارٍ تهيئة التطبيق..." />;
  if (auth.notPiBrowser) return <PiBrowserRequired />;
  if (auth.loading) return <FullPageLoader message="جارٍ الاتصال بشبكة Pi..." />;
  if (!auth.connected || !auth.user) return <LoginScreen onLogin={auth.login} loading={auth.loading} error={auth.error} />;

  return <AuthenticatedApp piUid={auth.user.uid} username={auth.user.username} />;
}

/* ═══ Authenticated Shell ═══ */
function AuthenticatedApp({ piUid, username }: { piUid: string; username: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [tab, setTab] = useState("dashboard");

  /* Store — persist store ID in localStorage for reload resilience */
  const [createdStore, setCreatedStore] = useState<StoreData | null>(null);

  // On mount, try to restore store from localStorage
  useEffect(function() {
    if (createdStore) return;
    try {
      const saved = localStorage.getItem("ledgererp_store");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.piUid) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCreatedStore(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist store to localStorage whenever it changes
  useEffect(function() {
    if (createdStore) {
      try { localStorage.setItem("ledgererp_store", JSON.stringify(createdStore)); } catch {}
    }
  }, [createdStore]);

  const storesRes = useQuery({
    queryKey: ["stores"],
    queryFn: function() { return api.get("/api/stores", piUid).then(function(r) { return r.json(); }); },
    staleTime: 30_000,
  });
  const stores = storesRes.data as StoreData[] | undefined;

  const myStore = useMemo(function() {
    if (createdStore) return createdStore;
    if (stores) {
      for (let i = 0; i < stores.length; i++) {
        if (stores[i].piUid === piUid) return stores[i];
      }
    }
    return null;
  }, [createdStore, stores, piUid]);

  /* Invoices */
  const merchantInvRes = useQuery({
    queryKey: ["invoices", "merchant", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/invoices?storeId=" + myStore!.id, piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const customerInvRes = useQuery({
    queryKey: ["invoices", "customer", piUid],
    queryFn: function() { return api.get("/api/invoices?customerPiUid=" + piUid, piUid).then(function(r) { return r.json(); }); },
    staleTime: 30_000,
  });

  /* Products */
  const productsRes = useQuery({
    queryKey: ["products", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/products?storeId=" + myStore!.id, piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });

  /* Mutations */
  const createStoreMut = useMutation({
    mutationFn: function(data: { piUid: string; name: string; description: string; avatar?: string }) {
      return api.post("/api/stores", data, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function(data) { setCreatedStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم إنشاء المتجر بنجاح" }); try { localStorage.setItem("ledgererp_store", JSON.stringify(data)); } catch {} },
    onError: function() { toast({ title: "فشل إنشاء المتجر", variant: "destructive" }); },
  });

  const updateStoreMut = useMutation({
    mutationFn: function(data: { id: string; name?: string; description?: string; avatar?: string }) {
      return api.patch("/api/stores", data, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function(data) { setCreatedStore(function(prev) { return prev ? Object.assign({}, prev, data) : (data as StoreData); }); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم تحديث المتجر" }); },
    onError: function() { toast({ title: "فشل التحديث", variant: "destructive" }); },
  });

  const deleteStoreMut = useMutation({
    mutationFn: function(id: string) {
      return api.delete("/api/stores", { id: id }, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function() { setCreatedStore(null); try { localStorage.removeItem("ledgererp_store"); } catch {} qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم حذف المتجر" }); },
    onError: function() { toast({ title: "فشل الحذف", variant: "destructive" }); },
  });

  const updateInvoiceMut = useMutation({
    mutationFn: function(data: { id: string; status: string; paymentTxId?: string; releaseTxId?: string }) {
      return api.patch("/api/invoices", data, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  /* Stats */
  const stats = useMemo(function() {
    const mi = (merchantInvRes.data || []) as InvoiceData[];
    const ci = (customerInvRes.data || []) as InvoiceData[];
    const escrowed = mi.filter(function(inv) { return ["paid_escrow", "shipped", "delivered"].indexOf(inv.status) !== -1; });
    const disputed = mi.filter(function(inv) { return inv.status === "disputed"; });
    const cancelled = mi.filter(function(inv) { return inv.status === "cancelled"; });
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
  const payWithPi = useCallback(function(invoice: InvoiceData) {
    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: function(paymentId) {
        api.post("/api/pi_payment/approve", { paymentId: paymentId, invoiceId: invoice.id }, piUid).catch(function() { toast({ title: "فشل الموافقة على الدفعة", variant: "destructive" }); });
      },
      onReadyForServerCompletion: function(paymentId, txid) {
        api.post("/api/pi_payment/complete", { paymentId: paymentId, txid: txid, invoiceId: invoice.id }, piUid).then(function() {
          qc.invalidateQueries({ queryKey: ["invoices"] });
          toast({ title: "تم الدفع بنجاح! الأموال في الضمان" });
        }).catch(function() { toast({ title: "فشل إكمال الدفعة", variant: "destructive" }); });
      },
      onCancel: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم إلغاء الدفع" }); },
      onError: function() { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "خطأ في الدفع", variant: "destructive" }); },
    };
    const paymentData: PiPaymentData = {
      amount: invoice.total,
      memo: "فاتورة " + invoice.invoiceNumber + " — " + (invoice.store ? invoice.store.name : "Ledgererp"),
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
    createPiPayment(paymentData, callbacks);
  }, [qc, toast, piUid]);

  /* A2U Release Pi to seller */
  const handleRelease = useCallback(function(invoice: InvoiceData) {
    if (!myStore) return;
    toast({ title: "جارٍ إطلاق الأموال..." });
    api.post("/api/pi/a2u", {
      amount: String(invoice.subtotal),
      uid: myStore.piUid,
      memo: "إطلاق ضمان فاتورة " + invoice.invoiceNumber,
      metadata: { invoiceId: invoice.id, type: "escrow_release" },
      invoiceId: invoice.id,
    }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        toast({ title: "تم إطلاق الأموال للبائع بنجاح ✅" });
      } else {
        return res.json().catch(function() { return {}; });
      }
    }).then(function(err) {
      if (err && err.error) toast({ title: "فشل الإطلاق", description: err.error, variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  }, [myStore, qc, toast, piUid]);

  const handleShip = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "shipped" }); toast({ title: "تم تحديث الحالة: تم الشحن" }); }, [updateInvoiceMut, toast]);
  const handleConfirm = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "delivered" }); toast({ title: "تم تأكيد التسليم" }); }, [updateInvoiceMut, toast]);
  const handleDispute = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "disputed" }); toast({ title: "تم فتح نزاع" }); }, [updateInvoiceMut, toast]);
  const handleCancel = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "cancelled" }); toast({ title: "تم إلغاء الطلب" }); }, [updateInvoiceMut, toast]);

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
            <TabsList className="grid grid-cols-6 w-full h-auto p-1 bg-muted/50">
              {[["dashboard", BarChart3, "الرئيسية"], ["products", Package, "المنتجات"], ["invoices", FileText, "الفواتير"], ["orders", ShoppingCart, "الطلبات"], ["settings", Settings, "الإعدادات"], ["pisetup", Zap, "إعداد Pi"]].map(function(t) {
              const Ic = t[1] as React.ElementType;
                return (
                  <TabsTrigger key={t[0] as string} value={t[0] as string} className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1">
                    <Ic className="h-3.5 w-3.5" /><span className="hidden xs:inline">{t[2] as string}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="dashboard"><DashboardView stats={stats} store={myStore} /></TabsContent>
            <TabsContent value="products"><ProductsView products={(productsRes.data || []) as ProductData[]} storeId={myStore.id} piUid={piUid} /></TabsContent>
            <TabsContent value="invoices"><InvoicesView store={myStore} products={(productsRes.data || []) as ProductData[]} piUid={piUid} /></TabsContent>
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
              <SettingsView store={myStore} onUpdate={function(d) { updateStoreMut.mutate(d); }} onDelete={function() { deleteStoreMut.mutate(myStore.id); }} updating={updateStoreMut.isPending} deleting={deleteStoreMut.isPending} piUid={piUid} />
            </TabsContent>
            <TabsContent value="pisetup">
              <PiSetupView piUid={piUid} />
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
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [avatar, setAvatar] = useState("");
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
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={name} onChange={function(e) { setName(e.target.value); }} placeholder="مثال: متجر الإلكترونيات" className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">وصف المتجر</Label><Textarea value={desc} onChange={function(e) { setDesc(e.target.value); }} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5"><Label className="text-xs">رابط الصورة (اختياري)</Label><Input value={avatar} onChange={function(e) { setAvatar(e.target.value); }} placeholder="https://..." className="text-sm" dir="ltr" /></div>
          <Button onClick={function() { if (name.trim()) onCreate(name.trim(), desc.trim(), avatar.trim()); }} disabled={!name.trim() || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10">
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
  const cards = [
    { label: "إجمالي الفواتير", value: String(stats.totalInvoices), icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المنتجات", value: String(stats.totalProducts), icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "π في الضمان", value: Number(stats.escrowedPi || 0).toFixed(2), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "π مكتمل", value: Number(stats.completedPi || 0).toFixed(2), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];
  const recent = (stats.recentOrders || []) as InvoiceData[];
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
              const stepLabel = step[0] as string;
              const StepIcon = step[1] as React.ElementType;
              const stepColor = step[2] as string;
              return (
                <div key={stepLabel} className="flex items-center gap-1 shrink-0">
                  <div className={"w-7 h-7 rounded-lg " + stepColor + " flex items-center justify-center"}><StepIcon className="h-3.5 w-3.5" /></div>
                  <span className="text-muted-foreground whitespace-nowrap hidden sm:block">{stepLabel}</span>
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
function ProductsView({ products, storeId, piUid }: { products: ProductData[]; storeId: string; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [editForm, setEditForm] = useState<ProductData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductData | null>(null);

  const handleAdd = function() {
    if (!form.name.trim() || !form.price) return;
    const priceVal = parseFloat(form.price);
    if (isNaN(priceVal) || priceVal <= 0) { toast({ title: "السعر يجب أن يكون رقماً أكبر من صفر", variant: "destructive" }); return; }
    setSaving(true);
    api.post("/api/products", { storeId: storeId, name: form.name.trim(), description: form.description.trim(), price: priceVal }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setOpen(false); setForm({ name: "", description: "", price: "" }); toast({ title: "تم إضافة المنتج" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل الإضافة", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleEdit = function() {
    if (!editForm || !editForm.name.trim()) return;
    setSaving(true);
    const ef = editForm;
    api.patch("/api/products", { id: ef.id, name: ef.name.trim(), description: ef.description.trim(), price: ef.price, isActive: ef.isActive }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setEditOpen(false); setEditForm(null); toast({ title: "تم تحديث المنتج" }); }
      else { toast({ title: "فشل التحديث", variant: "destructive" }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleDelete = function(id: string) {
    api.delete("/api/products", { id: id }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: "تم حذف المنتج" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  const handleToggle = function(p: ProductData) {
    api.patch("/api/products", { id: p.id, isActive: !p.isActive }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: p.isActive ? "تم تعطيل المنتج" : "تم تفعيل المنتج" }); }
      else toast({ title: "فشل التحديث", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  const filtered = search ? products.filter(function(p) { return p.name.indexOf(search) !== -1; }) : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث عن منتج..." className="text-sm pr-9" /></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />إضافة</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle className="text-sm">منتج جديد</DialogTitle><DialogDescription className="text-xs">أضف منتجاً لمتجرك</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} placeholder="اسم المنتج" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} placeholder="وصف مختصر" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={form.price} onChange={function(e) { setForm(Object.assign({}, form, { price: e.target.value })); }} placeholder="0.00" className="text-sm" dir="ltr" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={!form.name.trim() || !form.price || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        search ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد نتائج</p>
            <p className="text-xs text-muted-foreground/70 mt-1">جرب بحثاً آخر</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد منتجات بعد</p>
            <p className="text-xs text-muted-foreground/70 mt-1">أضف أول منتج لمتجرك</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(function(p) {
            return (
              <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }}>
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
                      <button onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={function() { setDeleteTarget(p); }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={function(open) { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتج</AlertDialogTitle><AlertDialogDescription className="text-xs">{deleteTarget ? "هل أنت متأكد من حذف «" + deleteTarget.name + "»؟ هذا الإجراء لا يمكن التراجع عنه." : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { if (deleteTarget) { handleDelete(deleteTarget.id); setDeleteTarget(null); } }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent><DialogHeader><DialogTitle className="text-sm">تعديل المنتج</DialogTitle><DialogDescription className="text-xs">عدّل بيانات المنتج</DialogDescription></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={editForm.name} onChange={function(e) { setEditForm(Object.assign({}, editForm, { name: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={editForm.description} onChange={function(e) { setEditForm(Object.assign({}, editForm, { description: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" value={editForm.price} onChange={function(e) { setEditForm(Object.assign({}, editForm, { price: parseFloat(e.target.value) || 0 })); }} className="text-sm" dir="ltr" /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">حالة النشر</Label><Switch checked={editForm.isActive} onCheckedChange={function(v) { setEditForm(Object.assign({}, editForm, { isActive: v })); }} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEdit} disabled={!editForm || !editForm.name.trim() || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══ Invoices ═══ */
function InvoicesView({ store, products, piUid }: { store: StoreData; products: ProductData[]; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerUid, setCustomerUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ productName: "", quantity: 1, unitPrice: 0 }]);
  const [detail, setDetail] = useState<InvoiceData | null>(null);

  const addItem = function() { setItems(items.concat([{ productName: "", quantity: 1, unitPrice: 0 }])); };
  const removeItem = function(idx: number) { setItems(items.filter(function(_, i) { return i !== idx; })); };
  const updateItem = function(idx: number, field: string, value: string | number) {
    const u = items.map(function(item, i) { if (i === idx) { const copy = Object.assign({}, item); (copy as Record<string, unknown>)[field] = value; return copy; } return item; });
    setItems(u);
  };

  const subtotal = items.reduce(function(s, i) { return s + i.unitPrice * i.quantity; }, 0);
  const escrowFee = subtotal * ESCROW_FEE_RATE;
  const total = subtotal + escrowFee;
  const canCreate = customerUid.trim() !== "" && items.some(function(i) { return i.productName && i.unitPrice > 0; });

  const handleCreate = function() {
    if (!canCreate) return;
    setSaving(true);
    api.post("/api/invoices", { storeId: store.id, customerPiUid: customerUid.trim(), customerName: customerName.trim(), items: items, notes: notes, escrowFee: escrowFee }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        setOpen(false); setCustomerName(""); setCustomerUid(""); setNotes("");
        setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
        toast({ title: "تم إنشاء الفاتورة" });
      } else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل إنشاء الفاتورة", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const invRes = useQuery({
    queryKey: ["invoices", "merchant", store.id],
    queryFn: function() { return api.get("/api/invoices?storeId=" + store.id, piUid).then(function(r) { return r.json(); }); },
    staleTime: 30_000,
  });
  const invoiceList = (invRes.data || []) as InvoiceData[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">الفواتير <span className="text-muted-foreground font-normal text-xs">({invoiceList.length})</span></h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Plus className="h-3.5 w-3.5 ml-1.5" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">فاتورة جديدة</DialogTitle><DialogDescription className="text-xs">إنشاء فاتورة مع ضمان الدفع</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">اسم المشتري</Label><Input value={customerName} onChange={function(e) { setCustomerName(e.target.value); }} placeholder="اختياري" className="text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">UID المشتري *</Label><Input value={customerUid} onChange={function(e) { setCustomerUid(e.target.value); }} placeholder="من Pi" className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">المنتجات</Label>{items.length < 10 && <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600"><Plus className="h-3 w-3 ml-1" />إضافة</Button>}</div>
                <div className="space-y-2">
                  {items.map(function(item, idx) {
                    const activeProducts = products.filter(function(p) { return p.isActive; });
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_48px_68px_28px] gap-1.5 items-end">
                        <div>
                          {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                          {idx === 0 ? (
                            <Input value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); }} placeholder="اسم المنتج" className="text-xs h-8" />
                          ) : (
                            <select value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); let found: ProductData | null = null; for (let k = 0; k < activeProducts.length; k++) { if (activeProducts[k].name === e.target.value) { found = activeProducts[k]; break; } } if (found) updateItem(idx, "unitPrice", found.price); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
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
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={notes} onChange={function(e) { setNotes(e.target.value); }} placeholder="اختياري..." className="text-sm min-h-[56px]" /></div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} π</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)</span><span>{escrowFee.toFixed(2)} π</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{total.toFixed(2)} π</span></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!canCreate || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}إنشاء</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invoiceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">لا توجد فواتير بعد</p>
          <p className="text-xs text-muted-foreground/70 mt-1">أنشئ أول فاتورة</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {invoiceList.map(function(inv) {
            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 space-y-2 cursor-pointer" onClick={function() { setDetail(inv); }}>
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
      <Dialog open={!!detail} onOpenChange={function(open) { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle className="text-sm">{detail.invoiceNumber}</DialogTitle><DialogDescription className="text-xs">{fmtDate(detail.createdAt)} — {detail.customerName || detail.customerPiUid}</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2"><StatusBadge status={detail.status} /><span className="text-sm font-bold text-emerald-600">{detail.total.toFixed(2)} π</span></div>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
                {detail.items.map(function(item, i) {
                  return (
                    <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate max-w-[50%]">{item.productName}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {item.unitPrice.toFixed(2)}π = <span className="font-medium text-foreground">{item.totalPrice.toFixed(2)}π</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{detail.subtotal.toFixed(2)} π</span></div>
                {detail.escrowFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم الضمان</span><span>{detail.escrowFee.toFixed(2)} π</span></div>}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold"><span>الإجمالي</span><span className="text-emerald-600">{detail.total.toFixed(2)} π</span></div>
              </div>
              {detail.notes && <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2"><span className="font-medium">ملاحظات:</span> {detail.notes}</div>}
              {detail.paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الدفع: {detail.paymentTxId}</div>}
              {detail.releaseTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الإطلاق: {detail.releaseTxId}</div>}
              {/* Timeline */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">تاريخ الحالة</p>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">إنشاء</span><span>{fmtDate(detail.createdAt)} {fmtTime(detail.createdAt)}</span></div>
                  {detail.paidAt && <div className="flex justify-between"><span className="text-blue-500">دفع الضمان</span><span>{fmtDate(detail.paidAt)} {fmtTime(detail.paidAt)}</span></div>}
                  {detail.shippedAt && <div className="flex justify-between"><span className="text-purple-500">شحن</span><span>{fmtDate(detail.shippedAt)} {fmtTime(detail.shippedAt)}</span></div>}
                  {detail.deliveredAt && <div className="flex justify-between"><span className="text-teal-500">تسليم</span><span>{fmtDate(detail.deliveredAt)} {fmtTime(detail.deliveredAt)}</span></div>}
                  {detail.completedAt && <div className="flex justify-between"><span className="text-emerald-500">إكمال</span><span>{fmtDate(detail.completedAt)} {fmtTime(detail.completedAt)}</span></div>}
                  {detail.cancelledAt && <div className="flex justify-between"><span className="text-zinc-500">إلغاء</span><span>{fmtDate(detail.cancelledAt)} {fmtTime(detail.cancelledAt)}</span></div>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={function() { copyText(detail!.invoiceNumber, toast, "تم نسخ رقم الفاتورة"); }}><Copy className="h-3 w-3 ml-1" />نسخ الرقم</Button>
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
  const [view, setView] = useState<string>("merchant");
  const [filter, setFilter] = useState("");
  const invoices = view === "merchant" ? merchantInvoices : customerInvoices;
  const filtered = filter ? invoices.filter(function(inv) { return inv.status === filter; }) : invoices;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-base shrink-0">الطلبات</h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg border p-0.5 bg-muted/50">
            <button onClick={function() { setView("merchant"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "merchant" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><Store className="h-3 w-3 inline ml-1" />بائع</button>
            <button onClick={function() { setView("customer"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "customer" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><ShoppingCart className="h-3 w-3 inline ml-1" />مشتري</button>
          </div>
        </div>
      </div>

      {merchantInvoices.length === 0 && customerInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">لا توجد طلبات بعد</p>
          <p className="text-xs text-muted-foreground/70 mt-1">ستظهر الطلبات هنا عند إنشاء فواتير</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد طلبات بهذا التصنيف</p></CardContent></Card>
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
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const canPay = view === "customer" && inv.status === "pending";
  const canShip = view === "merchant" && inv.status === "paid_escrow";
  const canConfirm = view === "customer" && inv.status === "shipped";
  const canRelease = view === "merchant" && inv.status === "delivered";
  const canDispute = view === "customer" && (inv.status === "paid_escrow" || inv.status === "shipped");
  const canCancel = inv.status === "pending";

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
          {canRelease && <ActionBtn icon={<Wallet className="h-3 w-3 ml-1" />} label="إطلاق Pi" onClick={function() { setLoading(true); onRelease(inv); setLoading(false); }} primary loading={loading} />}
          {canDispute && <ActionBtn icon={<AlertTriangle className="h-3 w-3 ml-1" />} label="فتح نزاع" onClick={function() { onDispute(inv); }} outline="border-red-500/30 text-red-500" />}
          {canCancel && (
            <AlertDialog><AlertDialogTrigger asChild><ActionBtn icon={<Ban className="h-3 w-3 ml-1" />} label="إلغاء" outline="border-red-500/30 text-red-500" /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">إلغاء الطلب</AlertDialogTitle><AlertDialogDescription className="text-xs">هل تريد إلغاء هذا الطلب؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">لا</AlertDialogCancel><AlertDialogAction onClick={function() { onCancel(inv); }} className="text-xs bg-red-600 hover:bg-red-700">نعم، إلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={function() { setExpanded(!expanded); }} className="h-7 px-2 text-[11px] text-muted-foreground mr-auto rounded-md hover:bg-muted transition-colors">
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
function SettingsView({ store, onUpdate, onDelete, updating, deleting, piUid: _piUid }: {
  store: StoreData; onUpdate: (d: { id: string; name?: string; description?: string; avatar?: string }) => void;
  onDelete: () => void; updating: boolean; deleting: boolean; piUid: string;
}) {
  const [name, setName] = useState(store.name);
  const [desc, setDesc] = useState(store.description);
  const [saved, setSaved] = useState(false);

  // Sync local state when store data changes from server
  useEffect(function() {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(store.name);
    setDesc(store.description);
  }, [store.name, store.description]);

  const handleSave = function() {
    onUpdate({ id: store.id, name: name.trim(), description: desc.trim() });
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  };

  const toast = useToast().toast;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="font-bold text-base">الإعدادات</h2>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Store className="h-3.5 w-3.5 text-emerald-500" />معلومات المتجر</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={name} onChange={function(e) { setName(e.target.value); setSaved(false); }} className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={desc} onChange={function(e) { setDesc(e.target.value); setSaved(false); }} className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">معرّف Pi (UID)</Label>
            <div className="flex items-center gap-2">
              <Input value={store.piUid} readOnly className="text-xs font-mono bg-muted/50" dir="ltr" />
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={function() { copyText(store.piUid, toast, "تم نسخ المعرف"); }}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updating || saved} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}
            {saved ? "تم الحفظ" : "حفظ التغييرات"}
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

/* ═══ Pi Setup ═══ */
interface TestPaymentRecord {
  uid: string;
  amount: string;
  memo: string;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  simulated?: boolean;
  error?: string;
}

function PiSetupView({ piUid }: { piUid: string }) {
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
