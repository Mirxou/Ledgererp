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
  FileCheck, Ban, CircleDot, Settings, Send, Copy, Eye,
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

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface StoreData { id: string; piUid: string; name: string; description: string; avatar: string; isVerified: boolean; _count?: { products: number; invoices: number } }
interface ProductData { id: string; storeId: string; name: string; description: string; price: number; image: string; isActive: boolean; createdAt: string }
interface InvoiceItemData { id?: string; productId?: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }
interface InvoiceData {
  id: string; invoiceNumber: string; storeId: string;
  customerPiUid: string; customerName: string;
  subtotal: number; escrowFee: number; total: number;
  status: string; notes: string; paymentTxId: string; releaseTxId: string;
  createdAt: string; updatedAt: string; items: InvoiceItemData[];
  store?: { name: string };
}

const ESCROW_FEE_RATE = 0.02;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:      { label: "في الانتظار",   color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",       icon: Clock },
  paid_escrow:  { label: "في الضمان",     color: "bg-blue-500/15 text-blue-600 border-blue-500/30",            icon: Shield },
  shipped:      { label: "تم الشحن",      color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",      icon: Truck },
  delivered:    { label: "تم التسليم",    color: "bg-teal-500/15 text-teal-600 border-teal-500/30",            icon: CheckCircle2 },
  completed:    { label: "مكتمل",         color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",  icon: FileCheck },
  disputed:     { label: "نزاع",          color: "bg-red-500/15 text-red-600 border-red-500/30",              icon: AlertTriangle },
  cancelled:    { label: "ملغى",          color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",           icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`${s.color} gap-1.5 font-medium text-[11px]`}>
      <Icon className="h-3 w-3" />{s.label}
    </Badge>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Full Page Loader
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   Not-Pi-Browser Landing
   ═══════════════════════════════════════════════════════════════ */
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
            {[["إدارة الفواتير الذكية", FileText], ["ضمان آمن للمعاملات", Shield], ["دفع بالـ Pi مع حماية البائع والمشتري", Wallet]].map(([t, I]) => (
              <div key={t as string} className="flex items-center gap-3 justify-end">
                <span>{t as string}</span>
                <I className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">Ledgererp — تطبيق معتمد ضمن إيكوسيستم Pi Network</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Login Screen
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   App Entry
   ═══════════════════════════════════════════════════════════════ */
export default function LedgererpApp() {
  const { sdkReady, notPiBrowser, connected, user, loading, error, login } = usePiAuth();

  if (loading && !sdkReady && !notPiBrowser) return <FullPageLoader message="جارٍ تهيئة التطبيق..." />;
  if (notPiBrowser) return <PiBrowserRequired />;
  if (loading) return <FullPageLoader message="جارٍ الاتصال بـ Pi Network..." />;
  if (!connected || !user) return <LoginScreen onLogin={login} loading={loading} error={error} />;

  return <AuthenticatedApp user={user} />;
}

/* ═══════════════════════════════════════════════════════════════
   Authenticated Shell
   ═══════════════════════════════════════════════════════════════ */
function AuthenticatedApp({ user }: { user: { uid: string; username: string; accessToken: string } }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  /* Store */
  const [createdStore, setCreatedStore] = useState<StoreData | null>(null);
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: () => fetch("/api/stores").then(r => r.json()),
  });
  const storeFromApi = useMemo(() => {
    if (stores && user) return (stores as StoreData[]).find(s => s.piUid === user.uid) ?? null;
    return null;
  }, [stores, user]);
  const myStore = createdStore || storeFromApi;

  /* Invoices */
  const { data: merchantInvoices, isLoading: miLoading } = useQuery({
    queryKey: ["invoices", "merchant", myStore?.id],
    queryFn: () => fetch(`/api/invoices?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });
  const { data: customerInvoices, isLoading: ciLoading } = useQuery({
    queryKey: ["invoices", "customer", user.uid],
    queryFn: () => fetch(`/api/invoices?customerPiUid=${user.uid}`).then(r => r.json()),
  });

  /* Products */
  const { data: products, isLoading: pLoading } = useQuery({
    queryKey: ["products", myStore?.id],
    queryFn: () => fetch(`/api/products?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });

  /* Mutations */
  const createStore = useMutation({
    mutationFn: (data: { piUid: string; name: string; description: string }) =>
      fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => { setCreatedStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم إنشاء المتجر بنجاح" }); },
    onError: () => toast({ title: "فشل إنشاء المتجر", variant: "destructive" }),
  });

  const updateStore = useMutation({
    mutationFn: (data: { id: string; name?: string; description?: string }) =>
      fetch("/api/stores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم تحديث المتجر" }); },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteStore = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/stores", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).then(r => r.json()),
    onSuccess: () => { setCreatedStore(null); qc.invalidateQueries({ queryKey: ["stores"] }); toast({ title: "تم حذف المتجر" }); },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: (data: { id: string; status: string; paymentTxId?: string; releaseTxId?: string }) =>
      fetch("/api/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  /* Stats */
  const stats = useMemo(() => {
    const mi = (merchantInvoices || []) as InvoiceData[];
    const ci = (customerInvoices || []) as InvoiceData[];
    const escrowed = mi.filter(i => ["paid_escrow", "shipped", "delivered"].includes(i.status));
    return {
      totalInvoices: mi.length,
      totalProducts: (products || []).length,
      escrowedPi: escrowed.reduce((s, i) => s + i.total, 0),
      completedPi: mi.filter(i => i.status === "completed").reduce((s, i) => s + i.total, 0),
      myOrders: ci.length,
      recentOrders: mi.slice(0, 5),
    };
  }, [merchantInvoices, customerInvoices, products]);

  /* Pay with Pi (U2A escrow deposit) */
  const payWithPi = useCallback((invoice: InvoiceData) => {
    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        fetch("/api/pi_payment/approve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, invoiceId: invoice.id }),
        }).catch(() => toast({ title: "فشل الموافقة على الدفعة", variant: "destructive" }));
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        fetch("/api/pi_payment/complete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, txid, invoiceId: invoice.id }),
        }).then(() => {
          qc.invalidateQueries({ queryKey: ["invoices"] });
          toast({ title: "تم الدفع بنجاح! الأموال في الضمان" });
        }).catch(() => toast({ title: "فشل إكمال الدفعة", variant: "destructive" }));
      },
      onCancel: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم إلغاء الدفع" }); },
      onError: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "خطأ في الدفع", variant: "destructive" }); },
    };

    const paymentData: PiPaymentData = {
      amount: invoice.total,
      memo: `فاتورة ${invoice.invoiceNumber} — ${invoice.store?.name || "Ledgererp"}`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
    createPiPayment(paymentData, callbacks);
  }, [qc, toast]);

  /* Ship order */
  const handleShip = (invoice: InvoiceData) => {
    updateInvoiceStatus.mutate({ id: invoice.id, status: "shipped" });
    toast({ title: "تم تحديث الحالة: تم الشحن" });
  };

  /* Confirm delivery (customer) */
  const handleConfirmDelivery = (invoice: InvoiceData) => {
    updateInvoiceStatus.mutate({ id: invoice.id, status: "delivered" });
    toast({ title: "تم تأكيد التسليم", description: "يمكن للبائع الآن إطلاق الأموال" });
  };

  /* Complete / Release Pi */
  const handleComplete = (invoice: InvoiceData) => {
    updateInvoiceStatus.mutate({ id: invoice.id, status: "completed" });
    toast({ title: "تم إكمال الطلب بنجاح ✅" });
  };

  /* Cancel */
  const handleCancel = (invoice: InvoiceData) => {
    updateInvoiceStatus.mutate({ id: invoice.id, status: "cancelled" });
    toast({ title: "تم إلغاء الطلب" });
  };

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
          <Badge variant="outline" className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CircleDot className="h-3 w-3" />{user.username}
          </Badge>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">
        {storesLoading && !myStore ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !myStore ? (
          <StoreSetup onCreate={(n, d) => createStore.mutate({ piUid: user.uid, name: n, description: d })} loading={createStore.isPending} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50">
              {([
                ["dashboard", BarChart3, "الرئيسية"],
                ["products", Package, "المنتجات"],
                ["invoices", FileText, "الفواتير"],
                ["orders", ShoppingCart, "الطلبات"],
                ["settings", Settings, "الإعدادات"],
              ] as const).map(([val, Icon, label]) => (
                <TabsTrigger key={val} value={val} className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1">
                  <Icon className="h-3.5 w-3.5" /><span className="hidden xs:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="dashboard"><DashboardView stats={stats} store={myStore} /></TabsContent>
            <TabsContent value="products"><ProductsView products={(products || []) as ProductData[]} storeId={myStore.id} /></TabsContent>
            <TabsContent value="invoices"><InvoicesView store={myStore} products={(products || []) as ProductData[]} /></TabsContent>
            <TabsContent value="orders">
              <OrdersView
                merchantInvoices={(merchantInvoices || []) as InvoiceData[]}
                customerInvoices={(customerInvoices || []) as InvoiceData[]}
                storeId={myStore.id} customerUid={user.uid}
                onPay={payWithPi} onShip={handleShip}
                onConfirmDelivery={handleConfirmDelivery} onComplete={handleComplete} onCancel={handleCancel}
              />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsView store={myStore} onUpdate={updateStore.mutate} onDelete={() => deleteStore.mutate(myStore.id)} updating={updateStore.isPending} deleting={deleteStore.isPending} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-3 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ledgererp — منصة الفواتير والضمان الآمن</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Store Setup
   ═══════════════════════════════════════════════════════════════ */
function StoreSetup({ onCreate, loading }: { onCreate: (name: string, desc: string) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
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
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المتجر</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: متجر الإلكترونيات" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">وصف المتجر</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[72px]" />
          </div>
          <Button onClick={() => { if (name.trim()) onCreate(name.trim(), desc.trim()); }} disabled={!name.trim() || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            إنشاء المتجر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ stats, store }: { stats: Record<string, unknown>; store: StoreData }) {
  const cards = [
    { label: "إجمالي الفواتير", value: stats.totalInvoices as number, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المنتجات", value: stats.totalProducts as number, icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Pi في الضمان", value: (stats.escrowedPi as number).toFixed(2), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Pi مكتمل", value: (stats.completedPi as number).toFixed(2), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const recentOrders = (stats.recentOrders || []) as InvoiceData[];

  return (
    <div className="space-y-4">
      {/* Store Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{store.name}</h2>
          <p className="text-xs text-muted-foreground">{store.description || "متجرك على Ledgererp"}</p>
        </div>
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <Store className="h-3 w-3 ml-1" />نشط
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`h-4.5 w-4.5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
                <p className="font-bold text-base leading-tight">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Escrow Flow */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />مسار الضمان (Escrow)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-between text-[10px] gap-1 overflow-x-auto pb-0.5">
            {([
              ["إنشاء فاتورة", FileText, "text-slate-500 bg-slate-100 dark:bg-slate-800"],
              ["دفع الضمان", CreditCard, "text-blue-500 bg-blue-50 dark:bg-blue-950/50"],
              ["شحن البضاعة", Truck, "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50"],
              ["تأكيد التسليم", CheckCircle2, "text-teal-500 bg-teal-50 dark:bg-teal-950/50"],
              ["إطلاق Pi", Wallet, "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"],
            ] as const).map(([label, Icon, color], i, arr) => (
              <div key={label} className="flex items-center gap-1 shrink-0">
                <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground whitespace-nowrap hidden sm:block">{label}</span>
                {i < arr.length - 1 && <ChevronDown className="h-3 w-3 text-muted-foreground/30 hidden sm:block" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />آخر الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 space-y-2">
            {recentOrders.map(inv => (
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Products
   ═══════════════════════════════════════════════════════════════ */
function ProductsView({ products, storeId }: { products: ProductData[]; storeId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [editForm, setEditForm] = useState<ProductData | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, name: form.name.trim(), description: form.description.trim(), price: parseFloat(form.price) || 0 }),
      });
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); setOpen(false); setForm({ name: "", description: "", price: "" }); toast({ title: "تم إضافة المنتج" }); }
      else toast({ title: "فشل الإضافة", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editForm?.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editForm.id, name: editForm.name.trim(), description: editForm.description.trim(), price: parseFloat(String(editForm.price)) || 0, isActive: editForm.isActive }),
      });
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); setEditOpen(false); setEditForm(null); toast({ title: "تم تحديث المنتج" }); }
      else toast({ title: "فشل التحديث", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/products", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "تم حذف المنتج" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
  };

  const handleToggle = async (p: ProductData) => {
    try {
      const res = await fetch("/api/products", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      if (res.ok) qc.invalidateQueries({ queryKey: ["products"] });
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">المنتجات <span className="text-muted-foreground font-normal text-xs">({products.length})</span></h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Plus className="h-3.5 w-3.5 ml-1.5" />إضافة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">منتج جديد</DialogTitle><DialogDescription className="text-xs">أضف منتجاً لمتجرك</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المنتج" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="text-sm" dir="ltr" /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.name.trim() || !form.price || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد منتجات بعد</p><p className="text-xs mt-1">أضف منتجاتك لبدء إنشاء الفواتير</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1" onClick={() => { setEditForm({ ...p }); setEditOpen(true); }} role="button" tabIndex={0}>
                    <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description || "بدون وصف"}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shrink-0 mr-2">{p.price} π</Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(p)} className="text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer" style={p.isActive ? { borderColor: "rgba(16,185,129,0.3)", color: "#059669", background: "rgba(16,185,129,0.1)" } : { borderColor: "rgba(161,161,170,0.3)", color: "#a1a1aa", background: "rgba(161,161,170,0.1)" }}>
                      {p.isActive ? "نشط" : "معطّل"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditForm({ ...p }); setEditOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><button className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتج</AlertDialogTitle><AlertDialogDescription className="text-xs">هل أنت متأكد من حذف &quot;{p.name}&quot;؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.id)} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">تعديل المنتج</DialogTitle><DialogDescription className="text-xs">عدّل بيانات المنتج</DialogDescription></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} className="text-sm" dir="ltr" /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">حالة النشر</Label><Switch checked={editForm.isActive} onCheckedChange={v => setEditForm({ ...editForm, isActive: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEdit} disabled={!editForm?.name.trim() || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Invoices (Create + List)
   ═══════════════════════════════════════════════════════════════ */
function InvoicesView({ store, products }: { store: StoreData; products: ProductData[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerUid, setCustomerUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<{ productName: string; quantity: number; unitPrice: number }[]>([{ productName: "", quantity: 1, unitPrice: 0 }]);

  const addItem = () => setItems(p => [...p, { productName: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems(p => { const u = [...p]; (u[idx] as Record<string, unknown>)[field] = value; return u; });
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const escrowFee = subtotal * ESCROW_FEE_RATE;
  const total = subtotal + escrowFee;
  const canCreate = customerUid.trim() !== "" && items.some(i => i.productName && i.unitPrice > 0);

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, customerPiUid: customerUid.trim(), customerName: customerName.trim(), items, notes, escrowFee }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        setOpen(false); setCustomerName(""); setCustomerUid(""); setNotes("");
        setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
        toast({ title: "تم إنشاء الفاتورة" });
      } else toast({ title: "فشل إنشاء الفاتورة", variant: "destructive" });
    } finally { setSaving(false); }
  };

  /* List merchant invoices */
  const { data: invoices } = useQuery({
    queryKey: ["invoices", "merchant", store.id],
    queryFn: () => fetch(`/api/invoices?storeId=${store.id}`).then(r => r.json()),
  });
  const invoiceList = (invoices || []) as InvoiceData[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">الفواتير</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><Plus className="h-3.5 w-3.5 ml-1.5" />فاتورة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">فاتورة جديدة</DialogTitle><DialogDescription className="text-xs">إنشاء فاتورة مع ضمان الدفع</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">اسم المشتري</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اختياري" className="text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">UID المشتري *</Label><Input value={customerUid} onChange={e => setCustomerUid(e.target.value)} placeholder="من Pi" className="text-sm" dir="ltr" inputMode="text" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">المنتجات</Label>{items.length < 10 && <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600"><Plus className="h-3 w-3 ml-1" />إضافة</Button>}</div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_52px_72px_26px] gap-1.5 items-end">
                      <div className="space-y-0.5">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                        {idx === 0 ? (
                          <Input value={item.productName} onChange={e => updateItem(idx, "productName", e.target.value)} placeholder="اسم المنتج" className="text-xs h-8" />
                        ) : (
                          <select value={item.productName} onChange={e => { updateItem(idx, "productName", e.target.value); const p = products.find(pr => pr.name === e.target.value); if (p) updateItem(idx, "unitPrice", p.price); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                            <option value="">اختر</option>
                            {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.name}>{p.name} — {p.price}π</option>)}
                          </select>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">الكمية</span>}
                        <Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="text-xs h-8 text-center" />
                      </div>
                      <div className="space-y-0.5">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">السعر</span>}
                        <Input type="number" step="0.01" inputMode="decimal" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="text-xs h-8" dir="ltr" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 text-destructive" disabled={items.length <= 1}><XCircle className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." className="text-sm min-h-[56px]" /></div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} π</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)</span><span>{escrowFee.toFixed(2)} π</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{total.toFixed(2)} π</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!canCreate || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invoiceList.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد فواتير بعد</p><p className="text-xs mt-1">أنشئ فاتورة جديدة من الزر أعلاه</p></CardContent></Card>
      ) : (
        <div className="space-y-2.5 max-h-[65vh] overflow-y-auto">
          {invoiceList.map(inv => (
            <Card key={inv.id} className="border-0 shadow-sm">
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.customerName || inv.customerPiUid} · {new Date(inv.createdAt).toLocaleDateString("ar-DZ")}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <StatusBadge status={inv.status} />
                    <p className="text-[11px] font-bold mt-0.5 text-emerald-600">{inv.total.toFixed(2)} π</p>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground flex gap-2">
                  <span>{inv.items?.length || 0} منتج</span><span>·</span><span>{inv.subtotal.toFixed(2)} π</span>
                  {inv.escrowFee > 0 && <><span>·</span><span>ضمان {inv.escrowFee.toFixed(2)} π</span></>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Orders View
   ═══════════════════════════════════════════════════════════════ */
function OrdersView({
  merchantInvoices, customerInvoices, storeId, customerUid,
  onPay, onShip, onConfirmDelivery, onComplete, onCancel,
}: {
  merchantInvoices: InvoiceData[]; customerInvoices: InvoiceData[];
  storeId: string; customerUid: string;
  onPay: (inv: InvoiceData) => void;
  onShip: (inv: InvoiceData) => void;
  onConfirmDelivery: (inv: InvoiceData) => void;
  onComplete: (inv: InvoiceData) => void;
  onCancel: (inv: InvoiceData) => void;
}) {
  const [view, setView] = useState<"merchant" | "customer">("merchant");
  const invoices = view === "merchant" ? merchantInvoices : customerInvoices;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">الطلبات</h2>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button onClick={() => setView("merchant")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "merchant" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}><Store className="h-3 w-3 inline ml-1" />كبائع</button>
          <button onClick={() => setView("customer")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "customer" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}><ShoppingCart className="h-3 w-3 inline ml-1" />كمشتري</button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">{view === "merchant" ? "لا توجد طلبات بعد" : "لا توجد طلبات شراء"}</p></CardContent></Card>
      ) : (
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
          {invoices.map(inv => (
            <OrderCard key={inv.id} invoice={inv} view={view} onPay={onPay} onShip={onShip} onConfirmDelivery={onConfirmDelivery} onComplete={onComplete} onCancel={onCancel} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ invoice: inv, view, onPay, onShip, onConfirmDelivery, onComplete, onCancel }: {
  invoice: InvoiceData; view: "merchant" | "customer";
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onComplete: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const canPay = view === "customer" && inv.status === "pending";
  const canShip = view === "merchant" && inv.status === "paid_escrow";
  const canConfirm = view === "customer" && inv.status === "shipped";
  const canRelease = view === "merchant" && inv.status === "delivered";
  const canCancel = inv.status === "pending";

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="font-semibold text-xs truncate">{inv.invoiceNumber}</p>
              <p className="text-[10px] text-muted-foreground">{view === "merchant" ? (inv.customerName || inv.customerPiUid) : (inv.store?.name || "—")} · {new Date(inv.createdAt).toLocaleDateString("ar-DZ")}</p>
            </div>
          </div>
          <div className="text-left shrink-0">
            <StatusBadge status={inv.status} />
            <p className="text-xs font-bold mt-0.5 text-emerald-600">{inv.total.toFixed(2)} π</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Package className="h-3 w-3" /><span>{inv.items?.length || 0} منتج</span><span>·</span><span>{inv.subtotal.toFixed(2)} π</span>
          {inv.escrowFee > 0 && <><span>·</span><span>ضمان {inv.escrowFee.toFixed(2)} π</span></>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canPay && <ActionBtn icon={<CreditCard className="h-3 w-3 ml-1" />} label="دفع بالـ Pi" onClick={() => onPay(inv)} primary />}
          {canShip && <ActionBtn icon={<Truck className="h-3 w-3 ml-1" />} label="شحن" onClick={() => onShip(inv)} outline="border-blue-500/30 text-blue-600" />}
          {canConfirm && <ActionBtn icon={<CheckCircle2 className="h-3 w-3 ml-1" />} label="تأكيد التسليم" onClick={() => onConfirmDelivery(inv)} outline="border-teal-500/30 text-teal-600" />}
          {canRelease && <ActionBtn icon={<Wallet className="h-3 w-3 ml-1" />} label="إطلاق Pi للبائع" onClick={() => onComplete(inv)} primary />}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild><ActionBtn icon={<Ban className="h-3 w-3 ml-1" />} label="إلغاء" outline="border-red-500/30 text-red-500" /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">إلغاء الطلب</AlertDialogTitle><AlertDialogDescription className="text-xs">هل تريد إلغاء هذا الطلب؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">لا</AlertDialogCancel><AlertDialogAction onClick={() => onCancel(inv)} className="text-xs bg-red-600 hover:bg-red-700">نعم، إلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={() => setExpanded(!expanded)} className="h-7 px-2 text-[11px] text-muted-foreground mr-auto rounded-md hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}التفاصيل
          </button>
        </div>

        {expanded && (
          <div className="border-t pt-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground">تفاصيل المنتجات</p>
            {inv.items?.map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-foreground truncate max-w-[50%]">{item.productName}</span>
                <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {item.unitPrice.toFixed(2)}π = <span className="font-medium text-foreground">{item.totalPrice.toFixed(2)}π</span></span>
              </div>
            ))}
            {inv.notes && <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2"><span className="font-medium">ملاحظات:</span> {inv.notes}</div>}
            {inv.paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/50 rounded-lg p-1.5 mt-1 break-all" dir="ltr">TX: {inv.paymentTxId}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionBtn({ icon, label, onClick, primary, outline }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean; outline?: string }) {
  if (primary) {
    return <Button size="sm" onClick={onClick} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">{icon}{label}</Button>;
  }
  return <Button size="sm" variant="outline" onClick={onClick} className={`h-7 text-[11px] ${outline || ""}`}>{icon}{label}</Button>;
}

/* ═══════════════════════════════════════════════════════════════
   Settings
   ═══════════════════════════════════════════════════════════════ */
function SettingsView({ store, onUpdate, onDelete, updating, deleting }: {
  store: StoreData;
  onUpdate: (data: { id: string; name?: string; description?: string }) => void;
  onDelete: () => void;
  updating: boolean;
  deleting: boolean;
}) {
  const [name, setName] = useState(store.name);
  const [desc, setDesc] = useState(store.description);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ id: store.id, name: name.trim(), description: desc.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="font-bold text-base">الإعدادات</h2>

      {/* Store Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2"><Store className="h-3.5 w-3.5 text-emerald-500" />معلومات المتجر</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المتجر</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setSaved(false); }} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف</Label>
            <Textarea value={desc} onChange={e => { setDesc(e.target.value); setSaved(false); }} className="text-sm min-h-[72px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">معرّف Pi (UID)</Label>
            <div className="flex items-center gap-2">
              <Input value={store.piUid} readOnly className="text-xs font-mono bg-muted/50" dir="ltr" />
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={() => { navigator.clipboard.writeText(store.piUid); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updating || saved} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}
            {saved ? "تم الحفظ" : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-500" />حول التطبيق</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>الإصدار</span><span className="font-mono text-foreground">1.0.0</span></div>
          <div className="flex justify-between"><span>الشبكة</span><Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Pi Mainnet</Badge></div>
          <div className="flex justify-between"><span>المنتجات النشطة</span><span className="text-foreground">{store._count?.products ?? "—"}</span></div>
          <div className="flex justify-between"><span>إجمالي الفواتير</span><span className="text-foreground">{store._count?.invoices ?? "—"}</span></div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm border-t-2 border-t-red-500/20">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-red-500 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />منطقة الخطر</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">حذف المتجر سيحذف جميع المنتجات والفواتير المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={deleting} className="text-xs border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Trash2 className="h-3.5 w-3.5 ml-1.5" />}
                حذف المتجر
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">هل أنت متأكد تماماً؟</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">سيتم حذف &quot;{store.name}&quot; وجميع بياناته نهائياً.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="text-xs bg-red-600 hover:bg-red-700">نعم، احذف المتجر</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}