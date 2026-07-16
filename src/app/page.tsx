"use client";

/* ═══════════════════════════════════════════════════════════════════════════════
   Ledgererp — منصة الفواتير والضمان لتجارة Pi Network الآمنة
   Single-page client component for Pi Browser
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from "react";
import { usePiAuth } from "@/hooks/use-pi-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPiPayment,
  type PiPaymentData,
  type PiPaymentCallbacks,
} from "@/lib/pi-sdk";

import {
  ShoppingCart,
  FileText,
  Plus,
  Package,
  Store,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  CreditCard,
  Receipt,
  BarChart3,
  Loader2,
  Shield,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Wallet,
  Pencil,
  Trash2,
  FileCheck,
  Ban,
  CircleDot,
  Settings,
  Send,
  Copy,
  Eye,
  Search,
  Filter,
  TrendingUp,
  Users,
  ArrowLeft,
  MoreVertical,
  LogOut,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface StoreData {
  id: string;
  piUid: string;
  name: string;
  description: string;
  avatar: string;
  isVerified: boolean;
  _count?: { products: number; invoices: number };
}

interface ProductData {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isActive: boolean;
  createdAt: string;
}

interface InvoiceItemData {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  storeId: string;
  customerPiUid: string;
  customerName: string;
  subtotal: number;
  escrowFee: number;
  total: number;
  status: string;
  notes: string;
  paymentTxId: string;
  releaseTxId: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  items: InvoiceItemData[];
  store?: { name: string; piUid: string };
}

/* ─── Constants ────────────────────────────────────────────────────────────── */

const ESCROW_FEE_RATE = 0.02;

const STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "في الانتظار",
    color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    icon: Clock,
  },
  paid_escrow: {
    label: "في الضمان",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    icon: Shield,
  },
  shipped: {
    label: "تم الشحن",
    color: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    icon: Truck,
  },
  delivered: {
    label: "تم التسليم",
    color: "bg-teal-500/15 text-teal-600 border-teal-500/30",
    icon: CheckCircle2,
  },
  completed: {
    label: "مكتمل",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    icon: FileCheck,
  },
  disputed: {
    label: "نزاع",
    color: "bg-red-500/15 text-red-600 border-red-500/30",
    icon: AlertTriangle,
  },
  cancelled: {
    label: "ملغى",
    color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
    icon: Ban,
  },
};

const STATUS_ORDER = [
  "pending",
  "paid_escrow",
  "shipped",
  "delivered",
  "completed",
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-DZ");
}
function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ar-DZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtCurrency(val: number) {
  return val.toFixed(2);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   1. FullPageLoader
   ═══════════════════════════════════════════════════════════════════════════════ */

function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-emerald-950/30 to-background px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -inset-2 rounded-3xl bg-emerald-500/10 animate-ping" />
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      <p className="text-sm text-muted-foreground">
        {message || "جارٍ التحميل..."}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   2. PiBrowserRequired
   ═══════════════════════════════════════════════════════════════════════════════ */

function PiBrowserRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950/20 to-background">
      <Card className="border-0 shadow-lg max-w-sm w-full text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-base font-bold text-foreground">
            Ledgererp
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            منصة الفواتير والضمان الآمن
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-500 mb-1">
              مطلوب متصفح Pi Browser
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هذه التطبيق يعمل حصرياً داخل متصفح Pi Browser لضمان أمان
              المعاملات وتكاملها
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span>حماية كاملة بضمان Pi Network</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <span>معاملات آمنة ومشفّرة بالكامل</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span>تأكيد التسليم قبل الإطلاق</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3. LoginScreen
   ═══════════════════════════════════════════════════════════════════════════════ */

function LoginScreen({
  onLogin,
  loading,
  error,
}: {
  onLogin: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950/20 to-background">
      <Card className="border-0 shadow-lg max-w-sm w-full text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-base font-bold text-foreground">
            Ledgererp
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            منصة الفواتير والضمان لتجارة Pi Network الآمنة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}
          <Button
            onClick={onLogin}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Wallet className="h-4 w-4 ml-2" />
            )}
            تسجيل الدخول عبر Pi
          </Button>
          <p className="text-[11px] text-muted-foreground">
            سيتم المصادقة عبر حسابك في شبكة Pi
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   6. StoreSetup
   ═══════════════════════════════════════════════════════════════════════════════ */

function StoreSetup({
  piUid,
  onSuccess,
}: {
  piUid: string;
  onSuccess: (store: StoreData) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piUid, name, description, avatar }),
      });
      if (!res.ok) throw new Error("فشل إنشاء المتجر");
      return res.json() as Promise<StoreData>;
    },
    onSuccess: (store) => {
      toast({ title: "تم إنشاء المتجر بنجاح ✅" });
      qc.invalidateQueries({ queryKey: ["stores"] });
      onSuccess(store);
    },
    onError: () => {
      toast({ title: "فشل إنشاء المتجر", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-emerald-950/20 to-background">
      <Card className="border-0 shadow-lg max-w-sm w-full">
        <CardHeader className="pb-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-2">
            <Store className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-base font-bold text-center">
            إنشاء متجرك
          </CardTitle>
          <CardDescription className="text-xs text-center">
            أنشئ متجرك لبدء إدارة الفواتير والمنتجات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المتجر *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: متجر الأناقة"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لمتجرك..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">رابط الصورة الرمزية</Label>
            <Input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="text-sm"
              dir="ltr"
            />
          </div>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!name.trim() || createMut.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Plus className="h-4 w-4 ml-2" />
            )}
            إنشاء المتجر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   7. DashboardView
   ═══════════════════════════════════════════════════════════════════════════════ */

function DashboardView({
  store,
  invoices,
  products,
  onTabChange,
}: {
  store: StoreData;
  invoices: InvoiceData[];
  products: ProductData[];
  onTabChange: (tab: string) => void;
}) {
  const totalInvoices = invoices.length;
  const totalProducts = products.length;
  const inEscrow = invoices
    .filter((i) => ["paid_escrow", "shipped", "delivered"].includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const completedPi = invoices
    .filter((i) => i.status === "completed")
    .reduce((s, i) => s + i.subtotal, 0);

  const now = new Date();
  const thisMonth = invoices.filter((inv) => {
    const d = new Date(inv.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((s, i) => s + i.total, 0);
  const lastMonth = invoices.filter((inv) => {
    const d = new Date(inv.createdAt);
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === lm && d.getFullYear() === ly;
  });
  const lastMonthTotal = lastMonth.reduce((s, i) => s + i.total, 0);
  const revenueProgress =
    lastMonthTotal > 0
      ? Math.min((thisMonthTotal / lastMonthTotal) * 100, 100)
      : thisMonthTotal > 0
        ? 100
        : 0;
  const revenueTrend =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : thisMonthTotal > 0
        ? 100
        : 0;

  const recentOrders = invoices.slice(0, 5);
  const steps = [
    { key: "pending", label: "إنشاء", icon: FileText },
    { key: "paid_escrow", label: "دفع", icon: CreditCard },
    { key: "shipped", label: "شحن", icon: Truck },
    { key: "delivered", label: "تسليم", icon: CheckCircle2 },
    { key: "completed", label: "إطلاق", icon: Wallet },
  ];

  return (
    <div className="space-y-4">
      {/* Store name + verified */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold">{store.name}</h2>
          {store.isVerified && (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/30 text-emerald-500"
            >
              <CheckCircle2 className="w-3 h-3 ml-1" />
              متجر موثّق
            </Badge>
          )}
        </div>
      </div>

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-lg font-bold">{totalInvoices}</p>
          <p className="text-[11px] text-muted-foreground">إجمالي الفواتير</p>
        </Card>
        <Card className="border-0 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-lg font-bold">{totalProducts}</p>
          <p className="text-[11px] text-muted-foreground">المنتجات</p>
        </Card>
        <Card className="border-0 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-lg font-bold">{fmtCurrency(inEscrow)}</p>
          <p className="text-[11px] text-muted-foreground">Pi في الضمان</p>
        </Card>
        <Card className="border-0 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-teal-500" />
            </div>
          </div>
          <p className="text-lg font-bold">{fmtCurrency(completedPi)}</p>
          <p className="text-[11px] text-muted-foreground">Pi مكتمل</p>
        </Card>
      </div>

      {/* Revenue progress */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">إيرادات هذا الشهر</p>
          <div className="flex items-center gap-1">
            {revenueTrend > 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            ) : revenueTrend < 0 ? (
              <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
            ) : null}
            <span
              className={`text-[11px] font-semibold ${revenueTrend >= 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              {revenueTrend > 0 ? "+" : ""}
              {revenueTrend.toFixed(0)}%
            </span>
          </div>
        </div>
        <Progress value={revenueProgress} className="h-2" />
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-muted-foreground">
            {fmtCurrency(thisMonthTotal)} π
          </span>
          <span className="text-[11px] text-muted-foreground">
            الشهر الماضي: {fmtCurrency(lastMonthTotal)} π
          </span>
        </div>
      </Card>

      {/* Escrow flow steps */}
      <Card className="border-0 shadow-sm p-4">
        <p className="text-xs font-semibold mb-3">مسار الضمان</p>
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-px bg-emerald-500/20 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent orders */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">آخر الطلبات</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-500 hover:text-emerald-600"
              onClick={() => onTabChange("orders")}
            >
              عرض الكل
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recentOrders.length === 0 ? (
            <div className="text-center py-6">
              <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">لا توجد طلبات بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((inv) => {
                const st = STATUS_MAP[inv.status] || STATUS_MAP.pending;
                const StIcon = st.icon;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StIcon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {inv.customerName || "عميل"}
                        </p>
                      </div>
                    </div>
                    <div className="text-left shrink-0 mr-2">
                      <p className="text-xs font-bold">
                        {fmtCurrency(inv.total)} π
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${st.color}`}
                      >
                        {st.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 border-0 shadow-sm"
          onClick={() => onTabChange("products")}
        >
          <Plus className="w-5 h-5 text-emerald-500" />
          <span className="text-[11px]">منتج جديد</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 border-0 shadow-sm"
          onClick={() => onTabChange("invoices")}
        >
          <FileText className="w-5 h-5 text-amber-500" />
          <span className="text-[11px]">فاتورة جديدة</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex-col gap-1.5 border-0 shadow-sm"
          onClick={() => onTabChange("orders")}
        >
          <ShoppingCart className="w-5 h-5 text-teal-500" />
          <span className="text-[11px]">الطلبات</span>
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   8. ProductsView
   ═══════════════════════════════════════════════════════════════════════════════ */

function ProductsView({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductData | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fImage, setFImage] = useState("");
  const [fActive, setFActive] = useState(true);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", storeId],
    queryFn: () =>
      fetch(`/api/products?storeId=${storeId}`).then((r) => r.json() as Promise<ProductData[]>),
  });

  const filtered = useMemo(() => {
    let list = products;
    if (filter === "active") list = list.filter((p) => p.isActive);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filter, search]);

  const resetForm = () => {
    setFName("");
    setFDesc("");
    setFPrice("");
    setFImage("");
    setFActive(true);
  };

  const openEdit = (p: ProductData) => {
    setEditProduct(p);
    setFName(p.name);
    setFDesc(p.description);
    setFPrice(String(p.price));
    setFImage(p.image);
    setFActive(p.isActive);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: fName,
          description: fDesc,
          price: Number(fPrice),
          image: fImage,
        }),
      });
      if (!res.ok) throw new Error("فشل إنشاء المنتج");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء المنتج بنجاح ✅" });
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowAdd(false);
      resetForm();
    },
    onError: () => toast({ title: "فشل إنشاء المنتج", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProduct.id,
          name: fName,
          description: fDesc,
          price: Number(fPrice),
          isActive: fActive,
        }),
      });
      if (!res.ok) throw new Error("فشل تحديث المنتج");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المنتج ✅" });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditProduct(null);
      resetForm();
    },
    onError: () => toast({ title: "فشل تحديث المنتج", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("فشل حذف المنتج");
    },
    onSuccess: () => {
      toast({ title: "تم حذف المنتج ✅" });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast({ title: "فشل حذف المنتج", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async (p: ProductData) => {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error("فشل تحديث الحالة");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast({ title: "فشل تحديث الحالة", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 shadow-sm p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="pr-9 text-sm h-9"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "active")}
        >
          <SelectTrigger className="w-28 h-9 text-xs">
            <Filter className="w-3 h-3 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">النشط</SelectItem>
          </SelectContent>
        </Select>
        <Dialog
          open={showAdd}
          onOpenChange={(o) => {
            setShowAdd(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">إضافة منتج جديد</DialogTitle>
              <DialogDescription className="text-xs">
                أدخل بيانات المنتج
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم المنتج *</Label>
                <Input
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="اسم المنتج"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  placeholder="وصف المنتج..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">السعر (π) *</Label>
                <Input
                  value={fPrice}
                  onChange={(e) => setFPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">رابط الصورة</Label>
                <Input
                  value={fImage}
                  onChange={(e) => setFImage(e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={!fName.trim() || !fPrice || createMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {createMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                )}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            لا توجد منتجات
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            أضف منتجك الأول لبدء البيع
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold truncate">{p.name}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border shrink-0 ${
                        p.isActive
                          ? "border-emerald-500/30 text-emerald-500"
                          : "border-zinc-500/30 text-zinc-500"
                      }`}
                    >
                      {p.isActive ? "نشط" : "معطّل"}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-base font-bold text-emerald-500 mb-3">
                {p.price} π
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={() => toggleMut.mutate(p)}
                  disabled={toggleMut.isPending}
                >
                  {toggleMut.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : p.isActive ? (
                    "تعطيل"
                  ) : (
                    "تفعيل"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm">
                        حذف المنتج
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        هل أنت متأكد من حذف المنتج &quot;{p.name}&quot؛؟ لا يمكن
                        التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-xs">
                        إلغاء
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMut.mutate(p.id)}
                        className="bg-red-600 hover:bg-red-700 text-xs"
                      >
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(o) => {
          if (!o) {
            setEditProduct(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">تعديل المنتج</DialogTitle>
            <DialogDescription className="text-xs">
              عدّل بيانات المنتج
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المنتج *</Label>
              <Input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوصف</Label>
              <Textarea
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">السعر (π) *</Label>
              <Input
                value={fPrice}
                onChange={(e) => setFPrice(e.target.value)}
                type="number"
                step="0.01"
                className="text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رابط الصورة</Label>
              <Input
                value={fImage}
                onChange={(e) => setFImage(e.target.value)}
                className="text-sm"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">نشط</Label>
              <Switch checked={fActive} onCheckedChange={setFActive} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditProduct(null);
                resetForm();
              }}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={!fName.trim() || !fPrice || updateMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {updateMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   9. InvoicesView
   ═══════════════════════════════════════════════════════════════════════════════ */

function InvoicesView({
  storeId,
  piUid,
  products,
}: {
  storeId: string;
  piUid: string;
  products: ProductData[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create invoice form
  const [cName, setCName] = useState("");
  const [cPiUid, setCPiUid] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cItems, setCItems] = useState<
    {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }[]
  >([]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["merchantInvoices", storeId],
    queryFn: () =>
      fetch(`/api/invoices?storeId=${storeId}`).then(
        (r) => r.json() as Promise<InvoiceData[]>
      ),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.trim().toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPiUid.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const addItem = useCallback(() => {
    setCItems((prev) => [
      ...prev,
      { productId: "", productName: "", quantity: 1, unitPrice: 0 },
    ]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setCItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateItem = useCallback(
    (idx: number, field: string, value: string | number) => {
      setCItems((prev) =>
        prev.map((item, i) => {
          if (i !== idx) return item;
          const updated = { ...item, [field]: value };
          if (field === "productId") {
            const prod = products.find((p) => p.id === value);
            if (prod) {
              updated.productName = prod.name;
              updated.unitPrice = prod.price;
            }
          }
          return updated;
        })
      );
    },
    [products]
  );

  const cSubtotal = useMemo(
    () => cItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cItems]
  );
  const cFee = cSubtotal * ESCROW_FEE_RATE;
  const cTotal = cSubtotal + cFee;

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          customerPiUid: cPiUid,
          customerName: cName,
          items: cItems.map((i) => ({
            productId: i.productId || undefined,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          notes: cNotes,
          escrowFee: cFee,
        }),
      });
      if (!res.ok) throw new Error("فشل إنشاء الفاتورة");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء الفاتورة بنجاح ✅" });
      qc.invalidateQueries({ queryKey: ["merchantInvoices"] });
      qc.invalidateQueries({ queryKey: ["customerInvoices"] });
      setShowCreate(false);
      setCName("");
      setCPiUid("");
      setCNotes("");
      setCItems([]);
    },
    onError: () =>
      toast({ title: "فشل إنشاء الفاتورة", variant: "destructive" }),
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `تم نسخ ${label}` }),
      () => toast({ title: "فشل النسخ", variant: "destructive" })
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 shadow-sm p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو العميل..."
            className="pr-9 text-sm h-9"
          />
        </div>
        <Dialog
          open={showCreate}
          onOpenChange={(o) => {
            setShowCreate(o);
            if (!o) {
              setCName("");
              setCPiUid("");
              setCNotes("");
              setCItems([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              <Plus className="w-4 h-4 ml-1" />
              فاتورة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">إنشاء فاتورة جديدة</DialogTitle>
              <DialogDescription className="text-xs">
                أضف بيانات العميل والمنتجات
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم العميل *</Label>
                <Input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="اسم العميل"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">معرّف Pi للعميل (UID) *</Label>
                <Input
                  value={cPiUid}
                  onChange={(e) => setCPiUid(e.target.value)}
                  placeholder="مثال: abc123def"
                  className="text-sm"
                  dir="ltr"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">المنتجات</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={addItem}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  إضافة منتج
                </Button>
              </div>

              {cItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  أضف منتجاً واحداً على الأقل
                </p>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/50 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        منتج {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => removeItem(idx)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updateItem(idx, "productId", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="اختر منتجاً..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => p.isActive)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {p.price} π
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">الكمية</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "quantity",
                              Math.max(1, Number(e.target.value))
                            )
                          }
                          className="h-8 text-xs"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">سعر الوحدة (π)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "unitPrice",
                              Number(e.target.value)
                            )
                          }
                          className="h-8 text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-left" dir="ltr">
                      المجموع: {(item.unitPrice * item.quantity).toFixed(2)} π
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm" dir="ltr">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{fmtCurrency(cSubtotal)} π</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)
                  </span>
                  <span>{fmtCurrency(cFee)} π</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>الإجمالي</span>
                  <span className="text-emerald-500">
                    {fmtCurrency(cTotal)} π
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات</Label>
                <Textarea
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={
                  !cName.trim() ||
                  !cPiUid.trim() ||
                  cItems.length === 0 ||
                  createMut.isPending
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {createMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                )}
                إنشاء الفاتورة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            لا توجد فواتير
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            أنشئ أول فاتورة لبدء التجارة
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {filtered.map((inv) => {
            const st = STATUS_MAP[inv.status] || STATUS_MAP.pending;
            const StIcon = st.icon;
            const isExpanded = expandedId === inv.id;
            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <StIcon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {inv.customerName || inv.customerPiUid} •{" "}
                          {fmtDate(inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <p className="text-sm font-bold text-emerald-500">
                        {fmtCurrency(inv.total)} π
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${st.color}`}
                      >
                        {st.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {/* Items */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        المنتجات
                      </p>
                      {inv.items.map((item, i) => (
                        <div
                          key={item.id || i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="font-semibold">
                            {fmtCurrency(item.totalPrice)} π
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-xs" dir="ltr">
                        <span>المجموع الفرعي</span>
                        <span>{fmtCurrency(inv.subtotal)} π</span>
                      </div>
                      <div className="flex justify-between text-xs" dir="ltr">
                        <span>رسوم الضمان</span>
                        <span>{fmtCurrency(inv.escrowFee)} π</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold" dir="ltr">
                        <span>الإجمالي</span>
                        <span className="text-emerald-500">
                          {fmtCurrency(inv.total)} π
                        </span>
                      </div>
                    </div>
                    {inv.notes && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          ملاحظات
                        </p>
                        <p className="text-xs">{inv.notes}</p>
                      </div>
                    )}
                    {inv.paymentTxId && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          معرّف الدفع
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-emerald-500"
                          onClick={() =>
                            copyText(inv.paymentTxId, "معرّف الدفع")
                          }
                        >
                          <Copy className="w-3 h-3 ml-1" />
                          {inv.paymentTxId.slice(0, 16)}...
                        </Button>
                      </div>
                    )}
                    {/* Timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      {inv.paidAt && (
                        <div>
                          <Clock className="w-3 h-3 inline ml-1" />
                          الدفع: {fmtDate(inv.paidAt)}
                        </div>
                      )}
                      {inv.shippedAt && (
                        <div>
                          <Truck className="w-3 h-3 inline ml-1" />
                          الشحن: {fmtDate(inv.shippedAt)}
                        </div>
                      )}
                      {inv.deliveredAt && (
                        <div>
                          <CheckCircle2 className="w-3 h-3 inline ml-1" />
                          التسليم: {fmtDate(inv.deliveredAt)}
                        </div>
                      )}
                      {inv.completedAt && (
                        <div>
                          <FileCheck className="w-3 h-3 inline ml-1" />
                          الإكمال: {fmtDate(inv.completedAt)}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          copyText(inv.invoiceNumber, "رقم الفاتورة")
                        }
                      >
                        <Copy className="w-3 h-3 ml-1" />
                        نسخ الرقم
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   10. OrdersView
   ═══════════════════════════════════════════════════════════════════════════════ */

function OrdersView({
  myStore,
  piUid,
}: {
  myStore: StoreData;
  piUid: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [role, setRole] = useState<"merchant" | "customer">("merchant");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const { data: merchantInvoices = [] } = useQuery({
    queryKey: ["merchantInvoices", myStore.id],
    queryFn: () =>
      fetch(`/api/invoices?storeId=${myStore.id}`).then(
        (r) => r.json() as Promise<InvoiceData[]>
      ),
  });

  const { data: customerInvoices = [] } = useQuery({
    queryKey: ["customerInvoices", piUid],
    queryFn: () =>
      fetch(`/api/invoices?customerPiUid=${piUid}`).then(
        (r) => r.json() as Promise<InvoiceData[]>
      ),
  });

  const orders = role === "merchant" ? merchantInvoices : customerInvoices;

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.store?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const statusUpdateMut = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("فشل تحديث الحالة");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchantInvoices"] });
      qc.invalidateQueries({ queryKey: ["customerInvoices"] });
    },
    onError: () => toast({ title: "فشل تحديث الحالة", variant: "destructive" }),
  });

  const handleStatusChange = (inv: InvoiceData, newStatus: string, msg: string) => {
    statusUpdateMut.mutate(
      { id: inv.id, status: newStatus },
      { onSuccess: () => toast({ title: msg }) }
    );
  };

  const handlePay = (inv: InvoiceData) => {
    setPayingId(inv.id);
    const paymentData: PiPaymentData = {
      amount: inv.total,
      memo: `فاتورة ${inv.invoiceNumber} — ضمان`,
      metadata: {
        invoiceId: inv.id,
        type: "escrow_deposit",
        storeId: inv.storeId,
      },
    };

    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        fetch("/api/pi_payment/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, invoiceId: inv.id }),
        }).catch(() => {});
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        fetch("/api/pi_payment/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, txid, invoiceId: inv.id }),
        })
          .then(() => {
            qc.invalidateQueries({ queryKey: ["merchantInvoices"] });
            qc.invalidateQueries({ queryKey: ["customerInvoices"] });
            toast({ title: "تم الدفع بنجاح ووضع المبلغ في الضمان ✅" });
          })
          .catch(() => {});
      },
      onCancel: () => {
        setPayingId(null);
        toast({ title: "تم إلغاء الدفع", variant: "destructive" });
      },
      onError: (err) => {
        setPayingId(null);
        toast({
          title: "خطأ في الدفع",
          description: err.message,
          variant: "destructive",
        });
      },
    };

    createPiPayment(paymentData, callbacks);
  };

  const handleRelease = async (inv: InvoiceData) => {
    setReleasingId(inv.id);
    try {
      const res = await fetch("/api/pi/a2u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: String(inv.subtotal),
          uid: myStore.piUid,
          memo: `إطلاق ضمان فاتورة ${inv.invoiceNumber}`,
          metadata: { invoiceId: inv.id, type: "escrow_release" },
          invoiceId: inv.id,
        }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["merchantInvoices"] });
        qc.invalidateQueries({ queryKey: ["customerInvoices"] });
        toast({ title: "تم إطلاق الأموال للبائع بنجاح ✅" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "فشل إطلاق الأموال",
          description: (err as { error?: string }).error || "خطأ غير معروف",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setReleasingId(null);
    }
  };

  const getActionButtons = (inv: InvoiceData) => {
    const buttons: {
      label: string;
      onClick: () => void;
      variant: "default" | "outline" | "destructive";
      loading?: boolean;
      className?: string;
    }[] = [];

    if (role === "customer") {
      if (inv.status === "pending") {
        buttons.push({
          label: "دفع بالـ Pi",
          onClick: () => handlePay(inv),
          variant: "default",
          loading: payingId === inv.id,
          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
        });
      }
      if (inv.status === "shipped") {
        buttons.push({
          label: "تأكيد التسليم",
          onClick: () =>
            handleStatusChange(inv, "delivered", "تم تأكيد التسليم ✅"),
          variant: "default",
          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
        });
      }
      if (["paid_escrow", "shipped"].includes(inv.status)) {
        buttons.push({
          label: "فتح نزاع",
          onClick: () =>
            handleStatusChange(inv, "disputed", "تم فتح نزاع ⚠️"),
          variant: "destructive",
        });
      }
    }

    if (role === "merchant") {
      if (inv.status === "paid_escrow") {
        buttons.push({
          label: "شحن البضاعة",
          onClick: () =>
            handleStatusChange(inv, "shipped", "تم تحديث الحالة: تم الشحن 📦"),
          variant: "default",
          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
        });
      }
      if (inv.status === "delivered") {
        buttons.push({
          label: "إطلاق Pi للبائع",
          onClick: () => handleRelease(inv),
          variant: "default",
          loading: releasingId === inv.id,
          className: "bg-amber-600 hover:bg-amber-700 text-white",
        });
      }
    }

    if (inv.status === "pending") {
      buttons.push({
        label: "إلغاء",
        onClick: () =>
          handleStatusChange(inv, "cancelled", "تم إلغاء الطلب ❌"),
        variant: "destructive",
      });
    }

    return buttons;
  };

  const getTimelineSteps = (inv: InvoiceData) => {
    const steps: {
      label: string;
      icon: React.ElementType;
      done: boolean;
      active: boolean;
      time?: string;
    }[] = [
      {
        label: "إنشاء الفاتورة",
        icon: FileText,
        done: true,
        active: inv.status === "pending",
        time: inv.createdAt,
      },
      {
        label: "الدفع في الضمان",
        icon: CreditCard,
        done: ["paid_escrow", "shipped", "delivered", "completed", "disputed"].includes(inv.status),
        active: inv.status === "paid_escrow",
        time: inv.paidAt || undefined,
      },
      {
        label: "تم الشحن",
        icon: Truck,
        done: ["shipped", "delivered", "completed", "disputed"].includes(inv.status),
        active: inv.status === "shipped",
        time: inv.shippedAt || undefined,
      },
      {
        label: "تم التسليم",
        icon: CheckCircle2,
        done: ["delivered", "completed", "disputed"].includes(inv.status),
        active: inv.status === "delivered",
        time: inv.deliveredAt || undefined,
      },
      {
        label: "مكتمل",
        icon: FileCheck,
        done: inv.status === "completed",
        active: inv.status === "completed",
        time: inv.completedAt || undefined,
      },
    ];
    return steps;
  };

  return (
    <div className="space-y-4">
      {/* Role switcher */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50">
        <Button
          variant={role === "merchant" ? "default" : "ghost"}
          size="sm"
          className={`flex-1 h-8 text-xs ${role === "merchant" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          onClick={() => setRole("merchant")}
        >
          <Store className="w-3.5 h-3.5 ml-1" />
          كبائع
        </Button>
        <Button
          variant={role === "customer" ? "default" : "ghost"}
          size="sm"
          className={`flex-1 h-8 text-xs ${role === "customer" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          onClick={() => setRole("customer")}
        >
          <Users className="w-3.5 h-3.5 ml-1" />
          كمشتري
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث..."
            className="pr-9 text-sm h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 h-9 text-xs">
            <Filter className="w-3 h-3 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            لا توجد طلبات
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {role === "merchant"
              ? "ستظهر الطلبات هنا عند إنشاء فواتير"
              : "ستظهر طلباتك هنا عند الدفع"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {filtered.map((inv) => {
            const st = STATUS_MAP[inv.status] || STATUS_MAP.pending;
            const StIcon = st.icon;
            const isExpanded = expandedId === inv.id;
            const actions = getActionButtons(inv);
            const timeline = getTimelineSteps(inv);
            const otherParty =
              role === "merchant" ? inv.customerName || inv.customerPiUid : inv.store?.name || "متجر";

            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <StIcon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {otherParty} • {fmtDate(inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <p className="text-sm font-bold text-emerald-500">
                        {fmtCurrency(inv.total)} π
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${st.color}`}
                      >
                        {st.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {/* Items */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        المنتجات
                      </p>
                      {inv.items.map((item, i) => (
                        <div
                          key={item.id || i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="font-semibold">
                            {fmtCurrency(item.totalPrice)} π
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-xs" dir="ltr">
                        <span>الإجمالي</span>
                        <span className="text-emerald-500 font-bold">
                          {fmtCurrency(inv.total)} π
                        </span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        مسار الطلب
                      </p>
                      <div className="space-y-0">
                        {timeline.map((step, idx) => {
                          const Icon = step.icon;
                          return (
                            <div key={idx} className="flex gap-2">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                    step.done
                                      ? "bg-emerald-500/20"
                                      : step.active
                                        ? "bg-emerald-500/30 ring-2 ring-emerald-500/50"
                                        : "bg-muted"
                                  }`}
                                >
                                  <Icon
                                    className={`w-3.5 h-3.5 ${
                                      step.done || step.active
                                        ? "text-emerald-500"
                                        : "text-muted-foreground/40"
                                    }`}
                                  />
                                </div>
                                {idx < timeline.length - 1 && (
                                  <div
                                    className={`w-px h-4 ${
                                      step.done
                                        ? "bg-emerald-500/30"
                                        : "bg-muted"
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="pt-1">
                                <p
                                  className={`text-[11px] ${
                                    step.done || step.active
                                      ? "text-foreground font-medium"
                                      : "text-muted-foreground/40"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {step.time && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {fmtDate(step.time)} — {fmtTime(step.time)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {actions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {actions.map((btn, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant={btn.variant}
                            className={`h-8 text-xs ${btn.className || ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              btn.onClick();
                            }}
                            disabled={btn.loading}
                          >
                            {btn.loading && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                            )}
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   11. SettingsView
   ═══════════════════════════════════════════════════════════════════════════════ */

function SettingsView({
  store,
  piUid,
  productsCount,
  invoicesCount,
}: {
  store: StoreData;
  piUid: string;
  productsCount: number;
  invoicesCount: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sName, setSName] = useState(store.name);
  const [sDesc, setSDesc] = useState(store.description);
  const [sAvatar, setSAvatar] = useState(store.avatar);

  const updateStoreMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: store.id, name: sName, description: sDesc, avatar: sAvatar }),
      });
      if (!res.ok) throw new Error("فشل تحديث المتجر");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المتجر ✅" });
      qc.invalidateQueries({ queryKey: ["stores"] });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteStoreMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: store.id }),
      });
      if (!res.ok) throw new Error("فشل حذف المتجر");
    },
    onSuccess: () => {
      toast({ title: "تم حذف المتجر. أعد تحميل الصفحة." });
      qc.invalidateQueries({ queryKey: ["stores"] });
    },
    onError: () => toast({ title: "فشل حذف المتجر", variant: "destructive" }),
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `تم نسخ ${label}` }),
      () => toast({ title: "فشل النسخ", variant: "destructive" })
    );
  };

  const storeLink =
    typeof window !== "undefined"
      ? `${window.location.origin}?store=${store.id}`
      : "";

  return (
    <div className="space-y-4">
      {/* Store info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-bold">معلومات المتجر</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المتجر</Label>
            <Input
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف</Label>
            <Textarea
              value={sDesc}
              onChange={(e) => setSDesc(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">رابط الصورة الرمزية</Label>
            <Input
              value={sAvatar}
              onChange={(e) => setSAvatar(e.target.value)}
              className="text-sm"
              dir="ltr"
            />
          </div>
          <Button
            onClick={() => updateStoreMut.mutate()}
            disabled={updateStoreMut.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            {updateStoreMut.isPending && (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            )}
            حفظ التغييرات
          </Button>
        </CardContent>
      </Card>

      {/* Pi UID */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold">معرّف Pi (UID)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5" dir="ltr">
              {piUid}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => copyText(piUid, "معرّف Pi")}
          >
            <Copy className="w-3 h-3 ml-1" />
            نسخ
          </Button>
        </div>
      </Card>

      {/* Store link */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">رابط المتجر</p>
            <p
              className="text-[11px] text-muted-foreground mt-0.5 truncate"
              dir="ltr"
            >
              {storeLink}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0 mr-2"
            onClick={() => copyText(storeLink, "رابط المتجر")}
          >
            <Copy className="w-3 h-3 ml-1" />
            نسخ
          </Button>
        </div>
      </Card>

      {/* App info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-bold">معلومات التطبيق</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الإصدار</span>
              <span className="font-semibold">1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الشبكة</span>
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/30 text-emerald-500"
              >
                Pi Mainnet
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">المنتجات</span>
              <span className="font-semibold">{productsCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الفواتير</span>
              <span className="font-semibold">{invoicesCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-0 shadow-sm border border-red-500/20">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-bold text-red-500">
            منطقة الخطر
          </CardTitle>
          <CardDescription className="text-xs">
            حذف المتجر سيحذف جميع المنتجات والفواتير نهائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 ml-1" />
                حذف المتجر نهائياً
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  هل أنت متأكد تماماً؟
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  سيتم حذف المتجر &quot;{store.name}&quot; وجميع منتجاته وفواتيره.
                  هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteStoreMut.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-xs"
                >
                  {deleteStoreMut.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  )}
                  نعم، حذف نهائياً
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   5. AuthenticatedApp
   ═══════════════════════════════════════════════════════════════════════════════ */

function AuthenticatedApp({ piUid, username }: { piUid: string; username: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: () =>
      fetch("/api/stores").then((r) => r.json() as Promise<StoreData[]>),
  });

  const myStore = useMemo(
    () => stores.find((s) => s.piUid === piUid) || null,
    [stores, piUid]
  );

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", myStore?.id],
    queryFn: () =>
      fetch(`/api/products?storeId=${myStore!.id}`).then(
        (r) => r.json() as Promise<ProductData[]>
      ),
    enabled: !!myStore?.id,
  });

  const { data: merchantInvoices = [] } = useQuery({
    queryKey: ["merchantInvoices", myStore?.id],
    queryFn: () =>
      fetch(`/api/invoices?storeId=${myStore!.id}`).then(
        (r) => r.json() as Promise<InvoiceData[]>
      ),
    enabled: !!myStore?.id,
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `تم نسخ ${label}` }),
      () => toast({ title: "فشل النسخ", variant: "destructive" })
    );
  };

  // Loading
  if (storesLoading) {
    return <FullPageLoader message="جارٍ تحميل بيانات المتجر..." />;
  }

  // No store → show setup
  if (!myStore) {
    const handleSuccess = () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
    };
    return <StoreSetup piUid={piUid} onSuccess={handleSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">Ledgererp</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-0 shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-500">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline">{username}</span>
                <MoreVertical className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs"
                onClick={() => copyText(piUid, "معرّف Pi")}
              >
                <Copy className="w-3.5 h-3.5 ml-2" />
                نسخ معرّف Pi
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs"
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="w-3.5 h-3.5 ml-2" />
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red-500" disabled>
                <LogOut className="w-3.5 h-3.5 ml-2" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-5 h-10 bg-muted/50 mb-4">
            <TabsTrigger
              value="dashboard"
              className="text-[11px] gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الرئيسية</span>
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="text-[11px] gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">المنتجات</span>
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="text-[11px] gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الفواتير</span>
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-[11px] gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الطلبات</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-[11px] gap-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الإعدادات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {storesLoading || productsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-0 shadow-sm p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-16" />
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <DashboardView
                store={myStore}
                invoices={merchantInvoices}
                products={products}
                onTabChange={handleTabChange}
              />
            )}
          </TabsContent>

          <TabsContent value="products">
            <ProductsView storeId={myStore.id} />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesView
              storeId={myStore.id}
              piUid={piUid}
              products={products}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersView myStore={myStore} piUid={piUid} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsView
              store={myStore}
              piUid={piUid}
              productsCount={myStore._count?.products ?? products.length}
              invoicesCount={myStore._count?.invoices ?? merchantInvoices.length}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Sticky footer */}
      <footer className="sticky bottom-0 z-50 border-t border-border/50 bg-muted/30 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground">
            Ledgererp v1.0.0 — منصة الفواتير والضمان الآمن
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   4. LedgererpApp (default export)
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function LedgererpApp() {
  const { sdkReady, notPiBrowser, connected, user, loading, error, login } =
    usePiAuth();

  /* ── Loading / detection ─────────────────────────────────── */
  if (loading) {
    return <FullPageLoader message="جارٍ الاتصال بشبكة Pi..." />;
  }

  /* ── Not Pi Browser ───────────────────────────────────────── */
  if (notPiBrowser) {
    return <PiBrowserRequired />;
  }

  /* ── SDK ready but not connected → show login ────────────── */
  if (sdkReady && !connected) {
    return <LoginScreen onLogin={login} loading={loading} error={error} />;
  }

  /* ── Authenticated ────────────────────────────────────────── */
  if (connected && user) {
    return <AuthenticatedApp piUid={user.uid} username={user.username} />;
  }

  /* ── Fallback (should not reach) ──────────────────────────── */
  return <FullPageLoader />;
}