"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield, Store, Package, CheckCircle2, ChevronLeft,
  ShoppingCart, Plus, Minus, Wallet, Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatPi, calcEscrowFee, calcTotal } from "@/lib/pi-amount";
import type { StoreData, ProductData } from "@/lib/types";

/* ═══ Component Props ═══ */
interface StoreBuyerViewProps {
  storeId: string;
  onBack?: () => void;
}

/* ═══ Cart Item ═══ */
interface CartItem {
  product: ProductData;
  quantity: number;
}

/* ═══ Store Buyer View ═══ */
export function StoreBuyerView({ storeId, onBack }: StoreBuyerViewProps) {
  const toast = useToast().toast;
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch store + products (public) ── */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [storesRes, productsRes] = await Promise.all([
          fetch("/api/stores?limit=200"),
          fetch(`/api/products?storeId=${storeId}&limit=200`),
        ]);

        if (!storesRes.ok || !productsRes.ok) {
          setError("فشل في تحميل بيانات المتجر");
          return;
        }

        const storesJson = await storesRes.json();
        const productsJson = await productsRes.json();

        const allStores = (storesJson.data || []) as StoreData[];
        const foundStore = allStores.find((s) => s.id === storeId) || null;

        if (!foundStore) {
          setError("لم يتم العثور على المتجر");
          return;
        }

        setStore(foundStore);
        setProducts((productsJson.data || []) as ProductData[]);
      } catch {
        setError("فشل في الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [storeId]);

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
        <StoreBuyerHeader storeName={null} onBack={onBack} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
          <Skeleton className="h-24 w-full rounded-xl mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ── Error State ── */
  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
        <StoreBuyerHeader storeName={null} onBack={onBack} />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Store className="h-6 w-6 text-red-500" />
            </div>
            <p className="font-semibold">{error || "لم يتم العثور على المتجر"}</p>
            <Button variant="outline" onClick={() => { window.location.href = `${window.location.pathname}?stores`; }} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              العودة إلى دليل المتاجر
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.isActive);

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <StoreBuyerHeader storeName={store.name} onBack={onBack} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">
        {/* Store Header Card */}
        <Card className="border-emerald-500/20 bg-gradient-to-l from-emerald-500/5 to-transparent">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {store.avatar ? (
                <img
                  src={store.avatar}
                  alt={store.name}
                  className="h-14 w-14 rounded-full object-cover border-2 border-emerald-500/30 flex-shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Store className="h-7 w-7 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg truncate">{store.name}</h2>
                  {store.isVerified && (
                    <Badge className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/20 border">
                      <CheckCircle2 className="h-3 w-3" />
                      موثق
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {store.description || "لا يوجد وصف"}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Package className="h-3 w-3" />
                    {activeProducts.length} منتج
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <Shield className="h-3 w-3" />
                    ضمان آمن
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        {activeProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold mb-1">لا توجد منتجات متاحة</p>
            <p className="text-sm text-muted-foreground">لم يقم هذا المتجر بإضافة منتجات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProducts.map((product) => (
              <ProductCard key={product.id} product={product} store={store} storeId={storeId} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-3 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{store.name} — عبر Ledgererp</span>
          <span>ضمان آمن 🔒</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══ Product Card ═══ */
function ProductCard({
  product,
  store,
  storeId,
}: {
  product: ProductData;
  store: StoreData;
  storeId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card className="group hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        {/* Product image or placeholder */}
        {product.image ? (
          <div className="w-full h-32 rounded-md overflow-hidden bg-muted mb-2">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-24 rounded-md bg-gradient-to-br from-emerald-500/10 to-teal-600/10 flex items-center justify-center mb-2">
            <Package className="h-8 w-8 text-emerald-500/50" />
          </div>
        )}
        <CardTitle className="text-sm font-bold">{product.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="text-xs line-clamp-2 mb-3 flex-1">
          {product.description || "لا يوجد وصف"}
        </CardDescription>
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-600 text-base" dir="ltr">
            {formatPi(product.price)}π
          </span>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setDialogOpen(true)}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            اطلب الآن
          </Button>
        </div>

        {/* Order Dialog */}
        <OrderDialog
          product={product}
          store={store}
          storeId={storeId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </CardContent>
    </Card>
  );
}

/* ═══ Order Dialog ═══ */
function OrderDialog({
  product,
  store,
  storeId,
  open,
  onOpenChange,
}: {
  product: ProductData;
  store: StoreData;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast().toast;
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPiUid, setBuyerPiUid] = useState("");
  const [creating, setCreating] = useState(false);

  /* Computed totals */
  const subtotal = useMemo(() => calcTotal(product.price * quantity), [product.price, quantity]);
  const escrowFee = useMemo(() => calcEscrowFee(subtotal), [subtotal]);
  const total = useMemo(() => calcTotal(subtotal, escrowFee), [subtotal, escrowFee]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setBuyerName("");
      setBuyerPiUid("");
      setCreating(false);
    }
  }, [open]);

  /* ── Create Invoice ── */
  const handleCreateInvoice = useCallback(async () => {
    if (!buyerName.trim() || !buyerPiUid.trim()) {
      toast({ title: "يرجى إدخال الاسم ومعرف Pi", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/invoices/buyer-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          customerPiUid: buyerPiUid.trim(),
          customerName: buyerName.trim(),
          items: [
            {
              productId: product.id,
              productName: product.name,
              quantity,
              unitPrice: product.price,
            },
          ],
          escrowFee,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "فشل إنشاء الفاتورة", variant: "destructive" });
        return;
      }

      const invoice = await res.json();
      toast({ title: "تم إنشاء الفاتورة بنجاح" });
      onOpenChange(false);

      // Redirect to buyer invoice view
      window.location.href = `${window.location.pathname}?invoice=${invoice.invoiceNumber}`;
    } catch {
      toast({ title: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [storeId, product, quantity, buyerName, buyerPiUid, escrowFee, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
            اطلب: {product.name}
          </DialogTitle>
          <DialogDescription>
            من {store.name} — سيتم إنشاء فاتورة ضمان
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">الكمية</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-lg w-8 text-center" dir="ltr">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Buyer Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">اسم المشتري</Label>
            <Input
              placeholder="أدخل اسمك"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Buyer Pi UID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">معرف Pi</Label>
            <Input
              placeholder="أدخل معرف Pi الخاص بك"
              value={buyerPiUid}
              onChange={(e) => setBuyerPiUid(e.target.value)}
              className="h-9 text-sm"
              dir="ltr"
            />
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {product.name} × {quantity}
              </span>
              <span dir="ltr">{formatPi(subtotal)}π</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">رسوم الضمان (2%)</span>
              <span dir="ltr">{formatPi(escrowFee)}π</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-bold">
              <span>الإجمالي</span>
              <span className="text-emerald-600 text-lg" dir="ltr">{formatPi(total)}π</span>
            </div>
          </div>

          {/* Escrow Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              سيتم وضع المبلغ في حساب ضمان آمن حتى تأكيد استلام الطلب
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            إلغاء
          </Button>
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleCreateInvoice}
            disabled={creating || !buyerName.trim() || !buyerPiUid.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الإنشاء...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                إنشاء فاتورة
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Header Sub-Component ═══ */
function StoreBuyerHeader({
  storeName,
  onBack,
}: {
  storeName: string | null;
  onBack?: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack || (() => { window.location.href = `${window.location.pathname}?stores`; })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">Ledgererp</span>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Store name */}
        {storeName && (
          <span className="text-sm font-medium truncate">{storeName}</span>
        )}
      </div>
    </header>
  );
}
