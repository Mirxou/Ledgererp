"use client";

import { useState, useMemo, useCallback } from "react";
import { usePiAuth } from "@/hooks/use-pi-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPiPayment, type PiPaymentData, type PiPaymentCallbacks } from "@/lib/pi-sdk";
import {
  ShoppingCart, FileText, Plus, Package, Store, Truck,
  CheckCircle2, Clock, XCircle, AlertTriangle, CreditCard,
  Receipt, BarChart3, Loader2, Shield, ArrowRightLeft,
  ChevronDown, ChevronUp, Wallet,
  FileCheck, Ban, CircleDot,
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
import { Label } from "@/components/ui/label";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface StoreData { id: string; piUid: string; name: string; description: string; _count?: { products: number; invoices: number } }
interface ProductData { id: string; storeId: string; name: string; description: string; price: number; image: string; isActive: boolean; createdAt: string }
interface InvoiceItemData { id?: string; productId?: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }
interface InvoiceData {
  id: string; invoiceNumber: string; storeId: string;
  customerPiUid: string; customerName: string;
  subtotal: number; escrowFee: number; total: number;
  status: string; notes: string; paymentTxId: string; releaseTxId: string;
  createdAt: string; items: InvoiceItemData[];
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
    <Badge variant="outline" className={`${s.color} gap-1.5 font-medium`}>
      <Icon className="h-3.5 w-3.5" />{s.label}
    </Badge>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Loading Spinner
   ═══════════════════════════════════════════════════════════════ */
function FullPageLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Not-Pi-Browser Landing Page
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
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Ledgererp
            </h1>
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
            <div className="flex items-center gap-3 justify-end">
              <span>إدارة الفواتير الذكية</span>
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span>ضمان آمن للمعاملات</span>
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span>دفع بالـ Pi مع حماية البائع والمشتري</span>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Ledgererp — تطبيق معتمد ضمن إيكوسيستم Pi Network
          </p>
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-right">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <Button
            onClick={onLogin}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white h-11 text-sm font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4 ml-2" />
            )}
            {loading ? "جارٍ الاتصال..." : "تسجيل الدخول عبر Pi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Application Entry
   ═══════════════════════════════════════════════════════════════ */
export default function LedgererpApp() {
  const { sdkReady, notPiBrowser, connected, user, loading, error, login } = usePiAuth();

  /* ── Initial detection phase ──────────────────────────── */
  if (loading && !sdkReady && !notPiBrowser) {
    return <FullPageLoader message="جارٍ تهيئة التطبيق..." />;
  }

  /* ── Not in Pi Browser ────────────────────────────────── */
  if (notPiBrowser) {
    return <PiBrowserRequired />;
  }

  /* ── Authenticating ───────────────────────────────────── */
  if (loading) {
    return <FullPageLoader message="جارٍ الاتصال بـ Pi Network..." />;
  }

  /* ── Auth Error — show login button ───────────────────── */
  if (!connected || !user) {
    return <LoginScreen onLogin={login} loading={loading} error={error} />;
  }

  /* ── Authenticated — Main App ─────────────────────────── */
  return <AuthenticatedApp user={user} />;
}

/* ═══════════════════════════════════════════════════════════════
   Authenticated Shell
   ═══════════════════════════════════════════════════════════════ */
function AuthenticatedApp({
  user,
}: {
  user: { uid: string; username: string; accessToken: string };
}) {
  const qc = useQueryClient();
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
  const { data: merchantInvoices } = useQuery({
    queryKey: ["invoices", "merchant", myStore?.id],
    queryFn: () => fetch(`/api/invoices?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });
  const { data: customerInvoices } = useQuery({
    queryKey: ["invoices", "customer", user.uid],
    queryFn: () => fetch(`/api/invoices?customerPiUid=${user.uid}`).then(r => r.json()),
  });

  /* Products */
  const { data: products } = useQuery({
    queryKey: ["products", myStore?.id],
    queryFn: () => fetch(`/api/products?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });

  /* Mutations */
  const createStore = useMutation({
    mutationFn: (data: { piUid: string; name: string; description: string }) =>
      fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => { setCreatedStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); },
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
    const escrowed = mi.filter(i => i.status === "paid_escrow" || i.status === "shipped" || i.status === "delivered");
    return {
      totalInvoices: mi.length,
      totalProducts: (products || []).length,
      escrowedPi: escrowed.reduce((s, i) => s + i.total, 0),
      completedPi: mi.filter(i => i.status === "completed").reduce((s, i) => s + i.total, 0),
      myOrders: ci.length,
    };
  }, [merchantInvoices, customerInvoices, products]);

  /* ── Pay with Pi (U2A escrow deposit) ──────────────── */
  const payWithPi = useCallback((invoice: InvoiceData) => {
    const paymentData: PiPaymentData = {
      amount: invoice.total,
      memo: `فاتورة ${invoice.invoiceNumber} — ${invoice.store?.name || "Ledgererp"}`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };

    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        fetch("/api/pi_payment/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, invoiceId: invoice.id }),
        });
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        fetch("/api/pi_payment/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, txid, invoiceId: invoice.id }),
        });
      },
      onCancel: () => {
        qc.invalidateQueries({ queryKey: ["invoices"] });
      },
      onError: () => {
        qc.invalidateQueries({ queryKey: ["invoices"] });
      },
    };

    createPiPayment(paymentData, callbacks);
  }, [qc]);

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Ledgererp</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CircleDot className="h-3 w-3" />
              {user.username}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {storesLoading && !myStore ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : !myStore ? (
          <StoreSetup onCreate={(name, desc) => createStore.mutate({ piUid: user.uid, name, description: desc })} loading={createStore.isPending} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/50">
              <TabsTrigger value="dashboard" className="text-xs py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><BarChart3 className="h-3.5 w-3.5 ml-1.5" />لوحة التحكم</TabsTrigger>
              <TabsTrigger value="products" className="text-xs py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Package className="h-3.5 w-3.5 ml-1.5" />المنتجات</TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><FileText className="h-3.5 w-3.5 ml-1.5" />الفواتير</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><ShoppingCart className="h-3.5 w-3.5 ml-1.5" />الطلبات</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><DashboardView stats={stats} store={myStore} /></TabsContent>
            <TabsContent value="products"><ProductsView products={(products || []) as ProductData[]} storeId={myStore.id} /></TabsContent>
            <TabsContent value="invoices"><InvoicesView store={myStore} products={(products || []) as ProductData[]} /></TabsContent>
            <TabsContent value="orders">
              <OrdersView
                merchantInvoices={(merchantInvoices || []) as InvoiceData[]}
                customerInvoices={(customerInvoices || []) as InvoiceData[]}
                storeId={myStore.id}
                customerUid={user.uid}
                onStatusChange={updateInvoiceStatus.mutate}
                onPay={payWithPi}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-4 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Ledgererp — منصة الفواتير والضمان الآمن</span>
          <span>يعمل داخل متصفح Pi Network</span>
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
    <Card className="max-w-md mx-auto border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
          <Store className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-lg">إعداد متجرك</CardTitle>
        <CardDescription className="text-xs">أنشئ متجرك لبدء إصدار الفواتير واستقبال المدفوعات</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">اسم المتجر</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: متجر الإلكترونيات" className="text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">وصف المتجر</Label>
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[80px]" />
        </div>
        <Button
          onClick={() => { if (name.trim()) onCreate(name.trim(), desc.trim()); }}
          disabled={!name.trim() || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm h-10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
          إنشاء المتجر
        </Button>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ stats, store }: { stats: Record<string, number>; store: StoreData }) {
  const cards = [
    { label: "إجمالي الفواتير", value: stats.totalInvoices, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المنتجات", value: stats.totalProducts, icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Pi في الضمان", value: stats.escrowedPi.toFixed(2), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Pi مكتمل", value: stats.completedPi.toFixed(2), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{store.name}</h2>
          <p className="text-xs text-muted-foreground">{store.description || "متجرك على Ledgererp"}</p>
        </div>
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <Store className="h-3 w-3 ml-1" />متجر نشط
        </Badge>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                <p className="font-bold text-lg leading-tight">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Escrow Flow Visual */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
            مسار الضمان (Escrow)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between text-xs gap-1 overflow-x-auto pb-1">
            {[
              { label: "إنشاء فاتورة", icon: FileText, color: "text-slate-500 bg-slate-100 dark:bg-slate-800" },
              { label: "دفع الضمان", icon: CreditCard, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/50" },
              { label: "شحن البضاعة", icon: Truck, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50" },
              { label: "تأكيد التسليم", icon: CheckCircle2, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/50" },
              { label: "إطلاق Pi", icon: Wallet, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-1.5 shrink-0">
                <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center`}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground whitespace-nowrap hidden sm:block">{step.label}</span>
                {i < arr.length - 1 && <ChevronDown className="h-3 w-3 text-muted-foreground/30 shrink-0 sm:block hidden" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Products
   ═══════════════════════════════════════════════════════════════ */
function ProductsView({ products, storeId }: { products: ProductData[]; storeId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price) || 0,
        }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["products"] });
        setOpen(false);
        setForm({ name: "", description: "", price: "" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">المنتجات</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <Plus className="h-3.5 w-3.5 ml-1.5" />إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">منتج جديد</DialogTitle>
              <DialogDescription className="text-xs">أضف منتجاً لمتجرك</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المنتج" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">السعر (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="text-sm" dir="ltr" /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.name.trim() || !form.price || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد منتجات بعد</p>
            <p className="text-xs mt-1">أضف منتجاتك لبدء إنشاء الفواتير</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description || "بدون وصف"}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shrink-0 mr-2">
                    {p.price} π
                  </Badge>
                </div>
                {p.isActive && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /><span>نشط</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Create Invoice
   ═══════════════════════════════════════════════════════════════ */
function InvoicesView({ store, products }: { store: StoreData; products: ProductData[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerUid, setCustomerUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<{ productName: string; quantity: number; unitPrice: number }[]>([
    { productName: "", quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => setItems(prev => [...prev, { productName: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      (updated[idx] as Record<string, unknown>)[field] = value;
      return updated;
    });
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const escrowFee = subtotal * ESCROW_FEE_RATE;
  const total = subtotal + escrowFee;

  const handleCreate = async () => {
    if (!customerUid.trim() || items.some(i => !i.productName || i.unitPrice <= 0)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id, customerPiUid: customerUid.trim(), customerName: customerName.trim(), items, notes, escrowFee,
        }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        setOpen(false);
        setCustomerName(""); setCustomerUid(""); setNotes("");
        setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
      }
    } finally {
      setSaving(false);
    }
  };

  const canCreate = customerUid.trim() !== "" && items.some(i => i.productName && i.unitPrice > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">إنشاء فاتورة</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <Plus className="h-3.5 w-3.5 ml-1.5" />فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">فاتورة جديدة</DialogTitle>
              <DialogDescription className="text-xs">إنشاء فاتورة مع ضمان الدفع</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم المشتري</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم المستخدم" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">معرّف المشتري (UID)</Label>
                  <Input value={customerUid} onChange={e => setCustomerUid(e.target.value)} placeholder="uid من Pi" className="text-sm" dir="ltr" inputMode="text" autoCapitalize="off" autoCorrect="off" />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">المنتجات</Label>
                  {items.length < 10 && (
                    <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600">
                      <Plus className="h-3 w-3 ml-1" />إضافة
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_60px_80px_28px] gap-2 items-end">
                      <div className="space-y-1">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                        {idx === 0 ? (
                          <Input value={item.productName} onChange={e => updateItem(idx, "productName", e.target.value)} placeholder="اسم المنتج" className="text-xs h-8" />
                        ) : (
                          <select
                            value={item.productName}
                            onChange={e => {
                              updateItem(idx, "productName", e.target.value);
                              const p = products.find(pr => pr.name === e.target.value);
                              if (p) updateItem(idx, "unitPrice", p.price);
                            }}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            <option value="">اختر منتجاً</option>
                            {products.map(p => <option key={p.id} value={p.name}>{p.name} — {p.price} π</option>)}
                          </select>
                        )}
                      </div>
                      <div className="space-y-1">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">الكمية</span>}
                        <Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="text-xs h-8 text-center" />
                      </div>
                      <div className="space-y-1">
                        {idx === 0 && <span className="text-[10px] text-muted-foreground">السعر (π)</span>}
                        <Input type="number" step="0.01" inputMode="decimal" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="text-xs h-8" dir="ltr" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 text-destructive" disabled={items.length <= 1}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." className="text-sm min-h-[60px]" />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} π</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)</span><span>{escrowFee.toFixed(2)} π</span></div>
                <Separator className="my-1.5" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{total.toFixed(2)} π</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!canCreate || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}
                إنشاء الفاتورة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">أنشئ فاتورة جديدة من الزر أعلاه</p>
          <p className="text-xs mt-1">سيتم إرسال رابط الدفع للمشتري</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Orders View (Merchant + Customer)
   ═══════════════════════════════════════════════════════════════ */
function OrdersView({
  merchantInvoices, customerInvoices, storeId, customerUid,
  onStatusChange, onPay,
}: {
  merchantInvoices: InvoiceData[]; customerInvoices: InvoiceData[];
  storeId: string; customerUid: string;
  onStatusChange: (data: { id: string; status: string; paymentTxId?: string; releaseTxId?: string }) => void;
  onPay: (invoice: InvoiceData) => void;
}) {
  const [view, setView] = useState<"merchant" | "customer">("merchant");
  const invoices = view === "merchant" ? merchantInvoices : customerInvoices;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">الطلبات</h2>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button onClick={() => setView("merchant")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "merchant" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
            <Store className="h-3 w-3 inline ml-1" />كبائع
          </button>
          <button onClick={() => setView("customer")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${view === "customer" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
            <ShoppingCart className="h-3 w-3 inline ml-1" />كمشتري
          </button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{view === "merchant" ? "لا توجد طلبات بعد" : "لا توجد طلبات شراء بعد"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {invoices.map(inv => (
            <OrderCard key={inv.id} invoice={inv} view={view} onStatusChange={onStatusChange} onPay={onPay} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  invoice, view, onStatusChange, onPay,
}: {
  invoice: InvoiceData; view: "merchant" | "customer";
  onStatusChange: (data: { id: string; status: string; paymentTxId?: string; releaseTxId?: string }) => void;
  onPay: (invoice: InvoiceData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const canShip = view === "merchant" && invoice.status === "paid_escrow";
  const canConfirmDelivery = view === "customer" && invoice.status === "shipped";
  const canPay = view === "customer" && invoice.status === "pending";

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{invoice.invoiceNumber}</p>
              <p className="text-[11px] text-muted-foreground">
                {view === "merchant" ? (invoice.customerName || invoice.customerPiUid) : (invoice.store?.name || "—")}
                {" · "}
                {new Date(invoice.createdAt).toLocaleDateString("ar-DZ")}
              </p>
            </div>
          </div>
          <div className="text-left shrink-0">
            <StatusBadge status={invoice.status} />
            <p className="text-xs font-bold mt-1 text-emerald-600">{invoice.total.toFixed(2)} π</p>
          </div>
        </div>

        {/* Quick items preview */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Package className="h-3 w-3" />
          <span>{invoice.items?.length || 0} منتج</span>
          <span>·</span>
          <span>{invoice.subtotal.toFixed(2)} π</span>
          {invoice.escrowFee > 0 && <><span>·</span><span>ضمان {invoice.escrowFee.toFixed(2)} π</span></>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canPay && (
            <Button size="sm" onClick={() => onPay(invoice)} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <CreditCard className="h-3 w-3 ml-1.5" />دفع بالـ Pi
            </Button>
          )}
          {canShip && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange({ id: invoice.id, status: "shipped" })} className="h-8 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Truck className="h-3 w-3 ml-1.5" />شحن
            </Button>
          )}
          {canConfirmDelivery && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange({ id: invoice.id, status: "delivered" })} className="h-8 text-xs border-teal-500/30 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30">
              <CheckCircle2 className="h-3 w-3 ml-1.5" />تأكيد التسليم
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-8 text-xs text-muted-foreground mr-auto">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            التفاصيل
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">تفاصيل المنتجات</p>
            {invoice.items?.map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between text-xs py-1">
                <span className="text-foreground">{item.productName}</span>
                <span className="text-muted-foreground">
                  {item.quantity} × {item.unitPrice.toFixed(2)} π = <span className="font-medium text-foreground">{item.totalPrice.toFixed(2)} π</span>
                </span>
              </div>
            ))}
            {invoice.notes && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                <span className="font-medium">ملاحظات:</span> {invoice.notes}
              </div>
            )}
            {invoice.paymentTxId && (
              <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 rounded-lg p-2 mt-1 break-all" dir="ltr">
                TX: {invoice.paymentTxId}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}