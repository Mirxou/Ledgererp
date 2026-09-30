"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield, Search, Store, Package, ChevronLeft,
  CheckCircle2, MapPin, Link2, ShoppingCart,
  Plus, Minus, Wallet, Loader2, ArrowRight,
  Receipt, CreditCard,
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
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPi, calcEscrowFee, calcTotal } from "@/lib/pi-amount";
import type { StoreData, ProductData, InvoiceData } from "@/lib/types";

/* ═══ Component Props ═══ */
interface MerchantBuyerViewProps {
  buyerPiUid: string;       // The merchant's Pi UID (pre-filled as buyer)
  buyerName: string;        // The merchant's username (pre-filled as buyer)
  ownStoreId: string;       // The merchant's own store ID (to filter/mark)
  onPay?: (invoice: InvoiceData) => void;  // Pay callback
  onViewOrders?: () => void;               // Navigate to orders tab
}

/* ═══ View Mode ═══ */
type ViewMode = "directory" | "store";

/* ═══ Merchant Buyer View ═══ */
export function MerchantBuyerView({
  buyerPiUid,
  buyerName,
  ownStoreId,
  onPay,
  onViewOrders,
}: MerchantBuyerViewProps) {
  const toast = useToast().toast;

  /* ── View state ── */
  const [mode, setMode] = useState<ViewMode>("directory");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  /* ── Directory state ── */
  const [stores, setStores] = useState<StoreData[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  /* ── Store detail state ── */
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  /* ── Order success state ── */
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  /* ═══════════════════════════════════
     FETCH: Store Directory
     ═══════════════════════════════════ */
  const fetchStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      setStoresError(null);
      const res = await fetch("/api/stores?limit=200");
      if (!res.ok) {
        setStoresError("فشل في تحميل المتاجر");
        return;
      }
      const json = await res.json();
      setStores((json.data || []) as StoreData[]);
    } catch {
      setStoresError("فشل في الاتصال بالخادم");
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "directory") {
      fetchStores();
    }
  }, [mode, fetchStores]);

  /* ═══════════════════════════════════
     FETCH: Store Detail + Products
     ═══════════════════════════════════ */
  useEffect(() => {
    if (mode !== "store" || !selectedStoreId) return;

    async function fetchStoreData() {
      try {
        setStoreLoading(true);
        setStoreError(null);

        const [storesRes, productsRes] = await Promise.all([
          fetch("/api/stores?limit=200"),
          fetch(`/api/products?storeId=${selectedStoreId}&limit=200`),
        ]);

        if (!storesRes.ok || !productsRes.ok) {
          setStoreError("فشل في تحميل بيانات المتجر");
          return;
        }

        const storesJson = await storesRes.json();
        const productsJson = await productsRes.json();

        const allStores = (storesJson.data || []) as StoreData[];
        const foundStore = allStores.find((s) => s.id === selectedStoreId) || null;

        if (!foundStore) {
          setStoreError("لم يتم العثور على المتجر");
          return;
        }

        setStore(foundStore);
        setProducts((productsJson.data || []) as ProductData[]);
      } catch {
        setStoreError("فشل في الاتصال بالخادم");
      } finally {
        setStoreLoading(false);
      }
    }
    fetchStoreData();
  }, [mode, selectedStoreId]);

  /* ═══════════════════════════════════
     NAV: Visit Store
     ═══════════════════════════════════ */
  const visitStore = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);
    setMode("store");
  }, []);

  /* ═══════════════════════════════════
     NAV: Back to Directory
     ═══════════════════════════════════ */
  const backToDirectory = useCallback(() => {
    setMode("directory");
    setSelectedStoreId(null);
    setStore(null);
    setProducts([]);
    setStoreError(null);
  }, []);

  /* ═══════════════════════════════════
     FILTER: Search stores
     ═══════════════════════════════════ */
  const filteredStores = useMemo(() => {
    if (!debouncedSearch.trim()) return stores;
    const q = debouncedSearch.trim().toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [stores, debouncedSearch]);

  /* ═══════════════════════════════════
     RENDER: Directory Mode
     ═══════════════════════════════════ */
  if (mode === "directory") {
    return (
      <div className="space-y-4" dir="rtl">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن متجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Loading */}
        {storesLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {storesError && !storesLoading && (
          <Card className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Store className="h-6 w-6 text-red-500" />
            </div>
            <p className="font-semibold">{storesError}</p>
            <Button variant="outline" onClick={fetchStores} className="gap-2">
              إعادة المحاولة
            </Button>
          </Card>
        )}

        {/* Store Grid */}
        {!storesLoading && !storesError && (
          <>
            {/* Stats */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Store className="h-3 w-3" />
                {stores.length} متجر
              </Badge>
              {debouncedSearch && (
                <Badge variant="outline" className="gap-1.5">
                  <Search className="h-3 w-3" />
                  {filteredStores.length} نتيجة
                </Badge>
              )}
            </div>

            {/* Empty */}
            {filteredStores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-semibold text-lg mb-1">
                  {debouncedSearch ? "لا توجد نتائج" : "لا توجد متاجر بعد"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {debouncedSearch
                    ? "جرب البحث بكلمات مختلفة"
                    : "لم يتم تسجيل أي متجر بعد"}
                </p>
              </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map((s) => {
                const productCount = s._count?.products || 0;
                const isActive = productCount > 0;
                const isOwn = s.id === ownStoreId;

                return (
                  <Card
                    key={s.id}
                    className="group hover:shadow-md transition-shadow cursor-pointer border-border/60"
                    onClick={() => visitStore(s.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {s.avatar ? (
                          <img
                            src={s.avatar}
                            alt={s.name}
                            className="h-10 w-10 rounded-full object-cover border border-border/50 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <Store className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-bold truncate">
                              {s.name}
                            </CardTitle>
                            {s.isVerified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                            {s.source === "pi_connected" && (
                              <Badge className="text-[8px] px-1 py-0 h-3.5 bg-teal-500/15 text-teal-600 border-teal-500/20 border">
                                <Link2 className="h-2.5 w-2.5 ml-0.5" />Pi
                              </Badge>
                            )}
                            {/* Own store badge */}
                            {isOwn && (
                              <Badge className="text-[8px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-600 border-amber-500/20 border">
                                متجرك
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isActive && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-600 border-emerald-500/20 border">
                                نشط
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {productCount} منتج
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs line-clamp-2 mb-3">
                        {s.description || "لا يوجد وصف"}
                      </CardDescription>
                      <Button
                        size="sm"
                        className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          visitStore(s.id);
                        }}
                      >
                        <MapPin className="h-3 w-3" />
                        زيارة المتجر
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════
     RENDER: Store Detail Mode
     ═══════════════════════════════════ */

  /* Loading */
  if (storeLoading) {
    return (
      <div className="space-y-5" dir="rtl">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-2" onClick={backToDirectory}>
          <ChevronLeft className="h-4 w-4" />
          العودة للمتاجر
        </Button>
        <Skeleton className="h-24 w-full rounded-xl" />
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
      </div>
    );
  }

  /* Error */
  if (storeError || !store) {
    return (
      <div className="space-y-4" dir="rtl">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={backToDirectory}>
          <ChevronLeft className="h-4 w-4" />
          العودة للمتاجر
        </Button>
        <Card className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Store className="h-6 w-6 text-red-500" />
          </div>
          <p className="font-semibold">{storeError || "لم يتم العثور على المتجر"}</p>
          <Button variant="outline" onClick={backToDirectory} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            العودة إلى دليل المتاجر
          </Button>
        </Card>
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.isActive);
  const isOwnStore = store.id === ownStoreId;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={backToDirectory}>
        <ChevronLeft className="h-4 w-4" />
        العودة للمتاجر
      </Button>

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
                {isOwnStore && (
                  <Badge className="gap-1 text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/20 border">
                    متجرك
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
            <MerchantProductCard
              key={product.id}
              product={product}
              store={store}
              buyerPiUid={buyerPiUid}
              buyerName={buyerName}
              onInvoiceCreated={(invoice) => {
                setCreatedInvoice(invoice);
                setSuccessDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Order Success Dialog ── */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              تم إنشاء الفاتورة
            </DialogTitle>
            <DialogDescription>
              يمكنك الآن الدفع أو مراجعة طلباتك
            </DialogDescription>
          </DialogHeader>

          {createdInvoice && (
            <div className="space-y-4">
              {/* Invoice Number */}
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">رقم الفاتورة</p>
                <p className="font-mono font-bold text-base" dir="ltr">
                  {createdInvoice.invoiceNumber}
                </p>
              </div>

              {/* Invoice Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="font-bold text-emerald-600 text-lg" dir="ltr">
                  {formatPi(createdInvoice.total)}π
                </span>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                {onPay && (
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setSuccessDialogOpen(false);
                      onPay(createdInvoice);
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    ادفع الآن
                  </Button>
                )}
                {onViewOrders && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setSuccessDialogOpen(false);
                      onViewOrders();
                    }}
                  >
                    <Receipt className="h-4 w-4" />
                    عرض طلباتي
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSuccessDialogOpen(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════
   Merchant Product Card
   ═══════════════════════════════════════ */
function MerchantProductCard({
  product,
  store,
  buyerPiUid,
  buyerName,
  onInvoiceCreated,
}: {
  product: ProductData;
  store: StoreData;
  buyerPiUid: string;
  buyerName: string;
  onInvoiceCreated: (invoice: InvoiceData) => void;
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
        <MerchantOrderDialog
          product={product}
          store={store}
          buyerPiUid={buyerPiUid}
          buyerName={buyerName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onInvoiceCreated={onInvoiceCreated}
        />
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════
   Merchant Order Dialog
   Pre-filled with merchant's Pi UID & name
   ═══════════════════════════════════════ */
function MerchantOrderDialog({
  product,
  store,
  buyerPiUid,
  buyerName,
  open,
  onOpenChange,
  onInvoiceCreated,
}: {
  product: ProductData;
  store: StoreData;
  buyerPiUid: string;
  buyerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: (invoice: InvoiceData) => void;
}) {
  const toast = useToast().toast;
  const [quantity, setQuantity] = useState(1);
  const [creating, setCreating] = useState(false);

  /* Computed totals */
  const subtotal = useMemo(() => calcTotal(product.price * quantity), [product.price, quantity]);
  const escrowFee = useMemo(() => calcEscrowFee(subtotal), [subtotal]);
  const total = useMemo(() => calcTotal(subtotal, escrowFee), [subtotal, escrowFee]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setCreating(false);
    }
  }, [open]);

  /* ── Create Invoice ── */
  const handleCreateInvoice = useCallback(async () => {
    if (!buyerName.trim() || !buyerPiUid.trim()) {
      toast({ title: "بيانات المشتري غير مكتملة", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/invoices/buyer-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
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

      const invoice = (await res.json()) as InvoiceData;
      toast({ title: "تم إنشاء الفاتورة بنجاح" });
      onOpenChange(false);
      onInvoiceCreated(invoice);
    } catch {
      toast({ title: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [store.id, product, quantity, buyerName, buyerPiUid, escrowFee, toast, onOpenChange, onInvoiceCreated]);

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

          {/* Buyer Info (pre-filled, read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">اسم المشتري</Label>
            <Input
              value={buyerName}
              readOnly
              className="h-9 text-sm bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">معرف Pi</Label>
            <Input
              value={buyerPiUid}
              readOnly
              className="h-9 text-sm bg-muted/50 font-mono"
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
            disabled={creating}
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
