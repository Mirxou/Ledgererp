"use client";

import { useState, useEffect, useCallback } from "react";
import { usePi } from "@/lib/pi-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, FileText, Plus, Package, Store, Eye, RefreshCw,
  ShieldCheck, Truck, CheckCircle2, Clock, XCircle, AlertTriangle,
  Send, ArrowLeft, CreditCard, Receipt, User, BarChart3,
  ChevronDown, Loader2, Trash2, ExternalLink, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StudyContent from "@/components/StudyContent";

/* ─── Types ────────────────────────────────────────────── */
interface Product {
  id: string; storeId: string; name: string; description: string;
  price: number; image: string; isActive: boolean; createdAt: string;
}

interface InvoiceItem {
  id?: string; productId?: string; productName: string;
  quantity: number; unitPrice: number; totalPrice: number;
}

interface Invoice {
  id: string; invoiceNumber: string; storeId: string;
  customerPiUid: string; customerName: string;
  subtotal: number; escrowFee: number; total: number;
  status: string; notes: string; paymentTxId: string;
  releaseTxId: string; createdAt: string; updatedAt: string;
  items: InvoiceItem[]; store?: { name: string };
}

interface Store {
  id: string; piUid: string; name: string; description: string;
  isVerified: boolean; _count?: { products: number; invoices: number };
}

/* ─── Status Helpers ───────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:         { label: "في الانتظار",   color: "bg-gray-100 text-gray-700",       icon: Clock },
  paid_escrow:     { label: "محفوظ في الضمان", color: "bg-blue-100 text-blue-700",   icon: ShieldCheck },
  shipped:         { label: "تم الشحن",     color: "bg-amber-100 text-amber-700",     icon: Truck },
  delivered:       { label: "تم التوصيل",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  completed:       { label: "مكتمل",       color: "bg-green-100 text-green-700",     icon: CheckCircle2 },
  disputed:        { label: "نزاع",        color: "bg-red-100 text-red-700",         icon: AlertTriangle },
  cancelled:       { label: "ملغي",        color: "bg-gray-100 text-gray-500",       icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return <Badge className={`${s.color} gap-1 border-0 text-xs font-medium`}><Icon className="w-3 h-3" />{s.label}</Badge>;
}

/* ─── Pi Auth Gate ─────────────────────────────────────── */
function PiAuthGate({ children }: { children: React.ReactNode }) {
  const { isSDKReady, piUser, piAuth, piBalance } = usePi();

  if (!isSDKReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold mb-2">جاري تحميل بيئة Pi</h2>
          <p className="text-sm text-gray-500">يرجى فتح هذا التطبيق داخل متصفح Pi Browser</p>
        </Card>
      </div>
    );
  }

  if (!piUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">Ledgererp</h1>
          <p className="text-sm text-gray-500 mb-1">نظام الفواتير والضمان على شبكة Pi</p>
          <Badge className="bg-purple-100 text-purple-700 border-0 text-xs mb-6">محمي بآلية Escrow</Badge>
          <Button onClick={piAuth} className="w-full bg-purple-700 hover:bg-purple-800 text-white" size="lg">
            <User className="w-4 h-4 ml-2" />
            تسجيل الدخول عبر Pi
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            باستخدامك لهذا التطبيق، فإنك توافق على شروط الخدمة
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/* ─── Stat Card ────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="hover:shadow-md transition">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 bg-purple-100 rounded-xl"><Icon className="w-5 h-5 text-purple-700" /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
    MAIN APP COMPONENT
═══════════════════════════════════════════════════════════ */
export default function LedgererpApp() {
  const { piUser, piBalance } = usePi();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [showStudy, setShowStudy] = useState(false);

  /* Fetch or create store for current user */
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: () => fetch("/api/stores").then(r => r.json()),
  });

  useEffect(() => {
    if (stores && piUser) {
      const found = (stores as Store[]).find((s: Store) => s.piUid === piUser.uid);
      if (found) setMyStore(found);
      else setMyStore(null);
    }
  }, [stores, piUser]);

  /* Invoice queries */
  const merchantInvoices = useQuery({
    queryKey: ["invoices", "merchant", myStore?.id],
    queryFn: () => fetch(`/api/invoices?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });

  const customerInvoices = useQuery({
    queryKey: ["invoices", "customer", piUser?.uid],
    queryFn: () => fetch(`/api/invoices?customerPiUid=${piUser!.uid}`).then(r => r.json()),
    enabled: !!piUser?.uid,
  });

  /* Products query */
  const { data: products } = useQuery({
    queryKey: ["products", myStore?.id],
    queryFn: () => fetch(`/api/products?storeId=${myStore!.id}`).then(r => r.json()),
    enabled: !!myStore?.id,
  });

  /* Create store mutation */
  const createStore = useMutation({
    mutationFn: (data: { piUid: string; name: string; description: string }) =>
      fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => { setMyStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); },
  });

  /* Create invoice mutation */
  const createInvoice = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setActiveTab("orders"); },
  });

  /* Update invoice mutation */
  const updateInvoice = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  /* Create product mutation */
  const createProduct = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  /* Stats */
  const allMerchantInvoices = (merchantInvoices.data as Invoice[]) || [];
  const allCustomerInvoices = (customerInvoices.data as Invoice[]) || [];
  const escrowedPi = allMerchantInvoices
    .filter((i: Invoice) => i.status === "paid_escrow")
    .reduce((sum: number, i: Invoice) => sum + i.total, 0);
  const completedPi = allMerchantInvoices
    .filter((i: Invoice) => i.status === "completed")
    .reduce((sum: number, i: Invoice) => sum + i.total, 0);
  const activeProducts = (products as Product[] || []).filter((p: Product) => p.isActive).length;

  /* Pi Payment (escrow) */
  const handlePayEscrow = useCallback((invoice: Invoice) => {
    if (typeof window !== "undefined" && (window as unknown as { Pi?: { createPayment: (p: unknown, cb: unknown) => void } }).Pi) {
      const piSdk = (window as unknown as { Pi: { createPayment: (p: unknown, cb: unknown) => void } }).Pi;
      piSdk.createPayment(
        {
          amount: invoice.total,
          memo: `فاتورة ${invoice.invoiceNumber} — ضمان`,
          metadata: { invoiceId: invoice.id, type: "escrow" },
        },
        {
          onReadyForServerApproval: () => {},
          onCanceled: () => {},
          onFailed: () => {},
          onCompleted: (payment: { transaction_id: string }) => {
            updateInvoice.mutate({
              id: invoice.id,
              status: "paid_escrow",
              paymentTxId: payment.transaction_id,
            });
          },
        },
      );
    }
  }, [updateInvoice]);

  /* Release escrow */
  const handleReleaseEscrow = useCallback((invoice: Invoice) => {
    if (typeof window !== "undefined" && (window as unknown as { Pi?: { createPayment: (p: unknown, cb: unknown) => void } }).Pi) {
      const piSdk = (window as unknown as { Pi: { createPayment: (p: unknown, cb: unknown) => void } }).Pi;
      piSdk.createPayment(
        {
          amount: invoice.total,
          memo: `إطلاق ضمان — فاتورة ${invoice.invoiceNumber}`,
          metadata: { invoiceId: invoice.id, type: "escrow_release", toUid: invoice.storeId },
        },
        {
          onReadyForServerApproval: () => {},
          onCanceled: () => {},
          onFailed: () => {},
          onCompleted: (payment: { transaction_id: string }) => {
            updateInvoice.mutate({
              id: invoice.id,
              status: "completed",
              releaseTxId: payment.transaction_id,
            });
          },
        },
      );
    }
  }, [updateInvoice]);

  return (
    <PiAuthGate>
      {showStudy ? (
        <StudyPage onBack={() => setShowStudy(false)} />
      ) : (
        <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
          {/* ─── HEADER ──────────────────────────── */}
          <header className="bg-white border-b sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-tight">Ledgererp</h1>
                  <p className="text-[10px] text-gray-400">فواتير وضمان — Pi</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {piBalance !== null && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CreditCard className="w-3 h-3" />
                    {piBalance.toFixed(2)} Pi
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                    {piUser?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{piUser?.username}</span>
                </div>
              </div>
            </div>
          </header>

          {/* ─── MAIN CONTENT ───────────────────── */}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
            {/* Store setup banner */}
            {!myStore && (
              <SetupStoreBanner
                username={piUser?.username || ""}
                onCreate={(name, desc) => createStore.mutate({ piUid: piUser!.uid, name, description: desc })}
                loading={createStore.isPending}
              />
            )}

            {/* Stats row */}
            {myStore && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard icon={FileText} label="إجمالي الفواتير" value={allMerchantInvoices.length} />
                <StatCard icon={ShieldCheck} label="Pi في الضمان" value={escrowedPi.toFixed(2)} sub="في انتظار التوصيل" />
                <StatCard icon={CheckCircle2} label="Pi مكتملة" value={completedPi.toFixed(2)} sub="تم التسليم والإفراج" />
                <StatCard icon={Package} label="منتجات نشطة" value={activeProducts} />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-6 bg-white border">
                <TabsTrigger value="dashboard" className="flex-1 gap-1.5 text-xs">
                  <BarChart3 className="w-3.5 h-3.5" /> لوحة التحكم
                </TabsTrigger>
                <TabsTrigger value="products" className="flex-1 gap-1.5 text-xs">
                  <Package className="w-3.5 h-3.5" /> المنتجات
                </TabsTrigger>
                <TabsTrigger value="create" className="flex-1 gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> فاتورة جديدة
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 gap-1.5 text-xs">
                  <ShoppingCart className="w-3.5 h-3.5" /> الطلبات
                </TabsTrigger>
                <TabsTrigger value="my-orders" className="flex-1 gap-1.5 text-xs">
                  <Eye className="w-3.5 h-3.5" /> مشترياتي
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <DashboardView
                  store={myStore}
                  invoices={allMerchantInvoices}
                  products={products as Product[] || []}
                />
              </TabsContent>

              <TabsContent value="products">
                <ProductsView
                  storeId={myStore?.id || ""}
                  products={products as Product[] || []}
                  onAdd={(data) => createProduct.mutate({ ...data, storeId: myStore?.id })}
                />
              </TabsContent>

              <TabsContent value="create">
                <CreateInvoiceView
                  storeId={myStore?.id || ""}
                  storeName={myStore?.name || ""}
                  products={products as Product[] || []}
                  onCreate={createInvoice.mutate}
                  loading={createInvoice.isPending}
                />
              </TabsContent>

              <TabsContent value="orders">
                <OrdersView
                  invoices={allMerchantInvoices}
                  onUpdateStatus={(id, status) => updateInvoice.mutate({ id, status })}
                  onReleaseEscrow={handleReleaseEscrow}
                />
              </TabsContent>

              <TabsContent value="my-orders">
                <MyOrdersView
                  invoices={allCustomerInvoices}
                  onPayEscrow={handlePayEscrow}
                  onConfirmDelivery={(id) => updateInvoice.mutate({ id, status: "delivered" })}
                  onDispute={(id) => updateInvoice.mutate({ id, status: "disputed" })}
                />
              </TabsContent>
            </Tabs>
          </main>

          {/* ─── FOOTER ─────────────────────────── */}
          <footer className="bg-white border-t mt-auto py-4">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
              <p>Ledgererp — نظام الفواتير والضمان على شبكة Pi</p>
              <Button variant="link" className="text-xs text-purple-600 p-0 h-auto" onClick={() => setShowStudy(true)}>
                قراءة دراسة الإكوسيستم <ExternalLink className="w-3 h-3 mr-1" />
              </Button>
            </div>
          </footer>
        </div>
      )}
    </PiAuthGate>
  );
}

/* ─── Setup Store Banner ──────────────────────────────── */
function SetupStoreBanner({ username, onCreate, loading }: { username: string; onCreate: (name: string, desc: string) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <Card className="mb-6 border-purple-200 bg-purple-50/50">
      <CardContent className="p-6 text-center">
        <Store className="w-10 h-10 text-purple-600 mx-auto mb-3" />
        <h3 className="font-bold mb-1">أنشئ متجرك أولاً</h3>
        <p className="text-sm text-gray-500 mb-4">قم بإعداد متجرك لبدء إنشاء الفواتير وإدارة منتجاتك</p>
        <div className="max-w-sm mx-auto space-y-3">
          <Input placeholder="اسم المتجر" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="وصف مختصر (اختياري)" value={desc} onChange={e => setDesc(e.target.value)} />
          <Button
            className="w-full bg-purple-700 hover:bg-purple-800 text-white"
            disabled={!name || loading}
            onClick={() => onCreate(name, desc)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4 ml-2" />}
            إنشاء المتجر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Dashboard View ──────────────────────────────────── */
function DashboardView({ store, invoices, products }: { store: Store | null; invoices: Invoice[]; products: Product[] }) {
  const recent = invoices.slice(0, 5);
  const statusCounts = invoices.reduce((acc: Record<string, number>, i: Invoice) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">نظرة عامة — {store?.name}</CardTitle>
          <CardDescription>ملخص نشاط متجرك على شبكة Pi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <div key={key} className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
                <StatusBadge status={key} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">آخر الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا توجد فواتير بعد</p>
            ) : (
              <div className="space-y-2">
                {recent.map((inv: Invoice) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-xs font-mono">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{inv.customerName}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{inv.total.toFixed(2)} Pi</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">المنتجات ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا توجد منتجات بعد</p>
            ) : (
              <div className="space-y-2">
                {products.slice(0, 5).map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description || "بدون وصف"}</p>
                    </div>
                    <p className="text-sm font-bold text-purple-700">{p.price} Pi</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Products View ────────────────────────────────────── */
function ProductsView({ storeId, products, onAdd }: { storeId: string; products: Product[]; onAdd: (data: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const handleAdd = () => {
    if (!name || !price) return;
    onAdd({ name, description: desc, price: Number(price) });
    setName(""); setDesc(""); setPrice(""); setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">المنتجات ({products.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-700 hover:bg-purple-800 text-white text-xs"><Plus className="w-3.5 h-3.5 ml-1" /> إضافة منتج</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة منتج جديد</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>اسم المنتج *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: هاتف ذكي" className="mt-1" /></div>
              <div><Label>الوصف</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر للمنتج" className="mt-1" /></div>
              <div><Label>السعر (Pi) *</Label><Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="mt-1" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={handleAdd} disabled={!name || !price} className="bg-purple-700 hover:bg-purple-800 text-white">إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="py-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">لم تُضف منتجات بعد. أضف أول منتج للبدء.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p: Product) => (
            <Card key={p.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg"><Package className="w-4 h-4 text-purple-600" /></div>
                  {!p.isActive && <Badge variant="secondary" className="text-xs">غير نشط</Badge>}
                </div>
                <h3 className="font-bold text-sm mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description || "بدون وصف"}</p>
                <p className="text-lg font-black text-purple-700">{p.price} <span className="text-xs font-normal">Pi</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create Invoice View ─────────────────────────────── */
function CreateInvoiceView({ storeId, storeName, products, onCreate, loading }: {
  storeId: string; storeName: string; products: Product[];
  onCreate: (data: Record<string, unknown>) => void; loading: boolean;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPiUid, setCustomerPiUid] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ productName: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  const [notes, setNotes] = useState("");

  const addItem = () => setItems([...items, { productName: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    (updated[index] as Record<string, unknown>)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    }
    setItems(updated);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updated = [...items];
      updated[index] = { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price, totalPrice: product.price };
      setItems(updated);
    }
  };

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const escrowFee = subtotal * 0.01; // 1% escrow fee
  const total = subtotal + escrowFee;

  const handleSubmit = () => {
    if (!customerPiUid || items.length === 0 || items.some(i => !i.productName || i.unitPrice <= 0)) return;
    onCreate({
      storeId, customerPiUid, customerName, items, notes,
      escrowFee: escrowFee.toFixed(6),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> إنشاء فاتورة جديدة</CardTitle>
          <CardDescription>من: {storeName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>اسم العميل</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل (اختياري)" className="mt-1" /></div>
            <div><Label>Pi UID العميل *</Label><Input value={customerPiUid} onChange={e => setCustomerPiUid(e.target.value)} placeholder="أدخل معرف Pi الخاص بالعميل" className="mt-1" /></div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-bold">بنود الفاتورة *</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="text-xs"><Plus className="w-3 h-3 ml-1" /> إضافة بند</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  {products.length > 0 && (
                    <div className="w-full">
                      <Label className="text-xs">اختر منتج أو أدخل اسمه</Label>
                      <select
                        className="w-full mt-1 rounded-md border bg-white px-3 py-2 text-sm"
                        value={item.productId || ""}
                        onChange={e => { if (e.target.value) selectProduct(index, e.target.value); }}
                      >
                        <option value="">-- اختر منتج --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.price} Pi)</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs">اسم المنتج</Label>
                    <Input value={item.productName} onChange={e => updateItem(index, "productName", e.target.value)} placeholder="اسم المنتج" className="mt-1" />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">الكمية</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(index, "quantity", Number(e.target.value))} className="mt-1" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">السعر (Pi)</Label>
                    <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(index, "unitPrice", Number(e.target.value))} className="mt-1" />
                  </div>
                  <div className="w-24 text-left">
                    <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
                    <p className="text-sm font-bold">{item.totalPrice.toFixed(2)} Pi</p>
                  </div>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 h-9 w-9 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div><Label>ملاحظات</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية للعميل (اختياري)" className="mt-1" /></div>

          <Separator />

          {/* Totals */}
          <div className="bg-purple-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} Pi</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>رسوم الضمان (1%)</span><span>{escrowFee.toFixed(2)} Pi</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold text-purple-800"><span>الإجمالي</span><span>{total.toFixed(2)} Pi</span></div>
          </div>

          <Button
            className="w-full bg-purple-700 hover:bg-purple-800 text-white"
            size="lg"
            disabled={!customerPiUid || items.length === 0 || items.some(i => !i.productName || i.unitPrice <= 0) || loading}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
            إنشاء الفاتورة وإرسالها
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Merchant Orders View ────────────────────────────── */
function OrdersView({ invoices, onUpdateStatus, onReleaseEscrow }: {
  invoices: Invoice[]; onUpdateStatus: (id: string, status: string) => void;
  onReleaseEscrow: (invoice: Invoice) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">الطلبات الواردة ({invoices.length})</h2>
      {invoices.length === 0 ? (
        <Card className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">لا توجد طلبات بعد. أنشئ فاتورة لإرسال طلب لعميل.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: Invoice) => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</p>
                    <p className="font-bold">{inv.customerName || inv.customerPiUid}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString("ar-DZ")}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-purple-700">{inv.total.toFixed(2)} Pi</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1 mb-3">
                  {inv.items.map((item: InvoiceItem, i: number) => (
                    <div key={item.id || i} className="flex justify-between text-sm">
                      <span>{item.productName} x{item.quantity}</span>
                      <span className="font-medium">{item.totalPrice.toFixed(2)} Pi</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.status === "pending" && (
                    <Button size="sm" variant="outline" disabled className="text-xs">في انتظار دفع الضمان</Button>
                  )}
                  {inv.status === "paid_escrow" && (
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => onUpdateStatus(inv.id, "shipped")}>
                      <Truck className="w-3 h-3 ml-1" /> تأكيد الشحن
                    </Button>
                  )}
                  {inv.status === "shipped" && (
                    <Button size="sm" variant="outline" className="text-xs" disabled>في انتظار تأكيد التوصيل</Button>
                  )}
                  {inv.status === "delivered" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => onReleaseEscrow(inv)}>
                      <ShieldCheck className="w-3 h-3 ml-1" /> إطلاق الضمان
                    </Button>
                  )}
                  {inv.status === "disputed" && (
                    <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600">
                      <AlertTriangle className="w-3 h-3 ml-1" /> نزاع — قيد المراجعة
                    </Button>
                  )}
                  {inv.status === "completed" && (
                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Customer My Orders View ─────────────────────────── */
function MyOrdersView({ invoices, onPayEscrow, onConfirmDelivery, onDispute }: {
  invoices: Invoice[]; onPayEscrow: (invoice: Invoice) => void;
  onConfirmDelivery: (id: string) => void; onDispute: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">مشترياتي ({invoices.length})</h2>
      {invoices.length === 0 ? (
        <Card className="py-12 text-center">
          <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">لا توجد مشتريات بعد.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: Invoice) => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</p>
                    <p className="font-bold">{inv.store?.name || "متجر"}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString("ar-DZ")}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-purple-700">{inv.total.toFixed(2)} Pi</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1 mb-3">
                  {inv.items.map((item: InvoiceItem, i: number) => (
                    <div key={item.id || i} className="flex justify-between text-sm">
                      <span>{item.productName} x{item.quantity}</span>
                      <span className="font-medium">{item.totalPrice.toFixed(2)} Pi</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.status === "pending" && (
                    <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white text-xs" onClick={() => onPayEscrow(inv)}>
                      <ShieldCheck className="w-3 h-3 ml-1" /> دفع ووضع في الضمان
                    </Button>
                  )}
                  {inv.status === "paid_escrow" && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs"><ShieldCheck className="w-3 h-3 ml-1" /> الأموال محفوظة في الضمان — في انتظار الشحن</Badge>
                  )}
                  {inv.status === "shipped" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => onConfirmDelivery(inv.id)}>
                      <CheckCircle2 className="w-3 h-3 ml-1" /> تأكيد التوصيل
                    </Button>
                  )}
                  {inv.status === "shipped" && (
                    <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600" onClick={() => onDispute(inv.id)}>
                      <AlertTriangle className="w-3 h-3 ml-1" /> الإبلاغ عن مشكلة
                    </Button>
                  )}
                  {inv.status === "delivered" && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">تم التوصيل — في انتظار إطلاق الضمان</Badge>
                  )}
                  {inv.status === "completed" && (
                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل — تم إطلاق الضمان</Badge>
                  )}
                  {inv.status === "disputed" && (
                    <Badge className="bg-red-100 text-red-700 text-xs"><AlertTriangle className="w-3 h-3 ml-1" /> نزاع — قيد المراجعة</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Study Page (embedded) ────────────────────────────── */
function StudyPage({ onBack }: { onBack: () => void }) {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs"><ArrowLeft className="w-3.5 h-3.5 ml-1" /> العودة للتطبيق</Button>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs font-bold">دراسة إكوسيستم Pi</span>
        </div>
      </header>
      <StudyContent />
    </div>
  );
}