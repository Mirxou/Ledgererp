"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Minus, Trash2, Banknote, CreditCard, CircleDot,
  Printer, Loader2, X, ShoppingCart, UserCircle, CheckCircle2,
  Package, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { fmtDate, fmtTime, copyText } from "@/lib/helpers";
import type { StoreData, ProductData, CustomerData, InventoryData, LocalSaleData } from "@/lib/types";
import { InvoicePrintView } from "@/components/invoice-print-view";

/* ═══ Cart Item ═══ */
interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

/* ═══ Cashier POS View ═══ */
export function CashierPOSView({
  store,
  products,
  piUid,
  customers,
  inventory,
  localSales,
}: {
  store: StoreData;
  products: ProductData[];
  piUid: string;
  customers: CustomerData[];
  inventory?: InventoryData[];
  localSales: LocalSaleData[];
}) {
  const qc = useQueryClient();
  const toast = useToast().toast;

  /* ── Cart State ── */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pi">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [saleNotes, setSaleNotes] = useState("");

  /* ── Search ── */
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  /* ── Dialogs ── */
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<LocalSaleData | null>(null);

  /* ── Active Products (no costPrice visible) ── */
  const activeProducts = useMemo(function() {
    return products.filter(function(p) { return p.isActive; });
  }, [products]);

  /* ── Product Search Filter ── */
  const filteredProducts = useMemo(function() {
    if (!productSearch) return activeProducts;
    const q = productSearch.toLowerCase();
    return activeProducts.filter(function(p) {
      return p.name.toLowerCase().indexOf(q) !== -1 || p.sku.toLowerCase().indexOf(q) !== -1;
    });
  }, [activeProducts, productSearch]);

  /* ── Customer Search Filter ── */
  const filteredCustomers = useMemo(function() {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(function(c) {
      return c.name.toLowerCase().indexOf(q) !== -1 || c.phone.toLowerCase().indexOf(q) !== -1;
    });
  }, [customers, customerSearch]);

  /* ── Get available quantity for a product ── */
  const getAvailableQty = useCallback(function(productId: string): number | null {
    if (!inventory) return null;
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].productId === productId) {
        const inv = inventory[i];
        return inv.availableQuantity !== undefined ? inv.availableQuantity : inv.quantity - inv.reservedQuantity;
      }
    }
    return null;
  }, [inventory]);

  /* ── Cart Totals ── */
  const cartSubtotal = useMemo(function() {
    return roundPi(cart.reduce(function(sum, item) { return sum + item.unitPrice * item.quantity; }, 0));
  }, [cart]);

  const cartItemCount = useMemo(function() {
    return cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
  }, [cart]);

  /* ── Add to Cart ── */
  const addToCart = useCallback(function(product: ProductData) {
    setCart(function(prev) {
      const existing = prev.find(function(item) { return item.productId === product.id; });
      if (existing) {
        return prev.map(function(item) {
          if (item.productId === product.id) {
            return Object.assign({}, item, { quantity: item.quantity + 1 });
          }
          return item;
        });
      }
      return prev.concat([{ productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 }]);
    });
  }, []);

  /* ── Update Quantity ── */
  const updateQuantity = useCallback(function(productId: string, delta: number) {
    setCart(function(prev) {
      return prev.map(function(item) {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          return Object.assign({}, item, { quantity: newQty });
        }
        return item;
      });
    });
  }, []);

  /* ── Remove from Cart ── */
  const removeFromCart = useCallback(function(productId: string) {
    setCart(function(prev) { return prev.filter(function(item) { return item.productId !== productId; }); });
  }, []);

  /* ── Clear Cart ── */
  const clearCart = useCallback(function() {
    setCart([]);
    setSelectedCustomerId(null);
    setSaleNotes("");
  }, []);

  /* ── Create Sale Mutation ── */
  const createSaleMut = useMutation({
    mutationFn: function() {
      const items = cart.map(function(item) {
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      });
      return api.post("/api/local-sales", {
        storeId: store.id,
        customerId: selectedCustomerId || undefined,
        items: items,
        paymentMethod: paymentMethod,
        notes: saleNotes || undefined,
        taxAmount: 0,
        discountAmount: 0,
      }, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function(data) {
      const sale = data as LocalSaleData;
      setLastCompletedSale(sale);
      setShowConfirmDialog(false);
      setShowPrintDialog(true);
      clearCart();
      qc.invalidateQueries({ queryKey: ["localSales"] });
      toast({ title: "تم إنشاء البيع بنجاح ✅" });
    },
    onError: function() {
      setShowConfirmDialog(false);
      toast({ title: "فشل إنشاء البيع", variant: "destructive" });
    },
  });

  /* ── Recent Sales (last 5) ── */
  const recentSales = useMemo(function() {
    return localSales.slice(0, 5);
  }, [localSales]);

  /* ── Selected Customer Name ── */
  const selectedCustomerName = useMemo(function() {
    if (!selectedCustomerId) return null;
    const c = customers.find(function(cust) { return cust.id === selectedCustomerId; });
    return c ? c.name : null;
  }, [selectedCustomerId, customers]);

  /* ── Payment Method Label ── */
  const paymentLabel = function(method: string): string {
    if (method === "cash") return "نقدي";
    if (method === "card") return "بطاقة";
    if (method === "pi") return "Pi";
    return method;
  };

  /* ── Reprint Sale ── */
  const [reprintSale, setReprintSale] = useState<LocalSaleData | null>(null);

  /* ── Product Categorization ── */
  const productsByCategory = useMemo(function() {
    const groups: Record<string, ProductData[]> = {};
    for (let i = 0; i < filteredProducts.length; i++) {
      const p = filteredProducts[i];
      const catName = p.category ? p.category.nameAr : "أخرى";
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(p);
    }
    return groups;
  }, [filteredProducts]);

  const categoryNames = Object.keys(productsByCategory);

  /* ═══ RENDER ═══ */
  return (
    <div className="space-y-4">
      {/* Top Bar: Store Name + Cart Summary */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-lg">{store.name}</h2>
          <p className="text-xs text-muted-foreground">نقطة بيع الكاشير</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCustomerName && (
            <Badge variant="outline" className="gap-1 text-xs bg-teal-500/10 text-teal-600 border-teal-500/20">
              <UserCircle className="h-3 w-3" />{selectedCustomerName}
              <button onClick={function() { setSelectedCustomerId(null); }} className="mr-1 hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
            <ShoppingCart className="h-3 w-3" />{cartItemCount} عنصر — {formatPi(cartSubtotal)}π
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ═══ LEFT: Product Grid ═══ */}
        <div className="lg:col-span-7 space-y-3">
          {/* Product Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن منتج (الاسم أو الكود)..."
              value={productSearch}
              onChange={function(e) { setProductSearch(e.target.value); }}
              className="pr-9 text-sm"
            />
          </div>

          {/* Product Grid */}
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-3" style={{ scrollbarWidth: "thin" }}>
            {categoryNames.map(function(catName) {
              return (
                <div key={catName}>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">{catName}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {productsByCategory[catName].map(function(product) {
                      const inCart = cart.find(function(c) { return c.productId === product.id; });
                      const availableQty = getAvailableQty(product.id);
                      const isOutOfStock = availableQty !== null && availableQty <= 0;
                      return (
                        <button
                          key={product.id}
                          onClick={function() { if (!isOutOfStock) addToCart(product); }}
                          disabled={isOutOfStock}
                          className={"relative text-right p-3 rounded-lg border transition-all " + (
                            isOutOfStock
                              ? "opacity-40 cursor-not-allowed bg-muted/30 border-muted"
                              : inCart
                                ? "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15 active:scale-95"
                                : "bg-card border-border hover:bg-muted/50 hover:border-emerald-500/30 active:scale-95"
                          )}
                        >
                          {inCart && (
                            <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-emerald-600 font-bold text-sm mt-0.5">{formatPi(product.price)}π</p>
                          {availableQty !== null && (
                            <p className={"text-[10px] mt-0.5 " + (availableQty <= 3 ? "text-amber-500" : "text-muted-foreground")}>
                              متاح: {availableQty}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد منتجات</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Cart + Actions ═══ */}
        <div className="lg:col-span-5 space-y-3">
          {/* Cart */}
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />السلة
                </CardTitle>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-0.5">
                    <Trash2 className="h-3 w-3" />إفراغ
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">السلة فارغة</p>
                  <p className="text-[10px]">اضغط على منتج لإضافته</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {cart.map(function(item) {
                    const itemTotal = roundPi(item.unitPrice * item.quantity);
                    return (
                      <div key={item.productId} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{formatPi(item.unitPrice)}π × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={function() { updateQuantity(item.productId, -1); }}
                            className="w-6 h-6 rounded flex items-center justify-center bg-muted hover:bg-muted/80 text-xs font-bold"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={function() { updateQuantity(item.productId, 1); }}
                            className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-600"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-left min-w-[60px]">
                          <p className="text-sm font-bold text-emerald-600">{formatPi(itemTotal)}π</p>
                        </div>
                        <button
                          onClick={function() { removeFromCart(item.productId); }}
                          className="p-1 text-red-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">المجموع</span>
                    <span className="font-bold text-lg text-emerald-600">{formatPi(cartSubtotal)}π</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Lookup */}
          <div className="flex items-center gap-2">
            {selectedCustomerName ? (
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-teal-500/30 bg-teal-500/5">
                <UserCircle className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-medium">{selectedCustomerName}</span>
                <button onClick={function() { setSelectedCustomerId(null); }} className="mr-auto text-red-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={function() { setShowCustomerDialog(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 text-muted-foreground text-sm"
              >
                <UserCircle className="h-4 w-4" />إرفاق زبون (اختياري)
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={function() { setPaymentMethod("cash"); }}
              className={"flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-xs font-medium " + (
                paymentMethod === "cash"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600"
                  : "bg-card border-border hover:bg-muted/50"
              )}
            >
              <Banknote className="h-5 w-5" />نقدي
            </button>
            <button
              onClick={function() { setPaymentMethod("card"); }}
              className={"flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-xs font-medium " + (
                paymentMethod === "card"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600"
                  : "bg-card border-border hover:bg-muted/50"
              )}
            >
              <CreditCard className="h-5 w-5" />بطاقة
            </button>
            <button
              onClick={function() { setPaymentMethod("pi"); }}
              className={"flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-xs font-medium " + (
                paymentMethod === "pi"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600"
                  : "bg-card border-border hover:bg-muted/50"
              )}
            >
              <CircleDot className="h-5 w-5" />Pi
            </button>
          </div>

          {/* Sale Notes */}
          <Input
            placeholder="ملاحظات (اختياري)..."
            value={saleNotes}
            onChange={function(e) { setSaleNotes(e.target.value); }}
            className="text-xs"
          />

          {/* Complete Sale Button */}
          <Button
            onClick={function() { setShowConfirmDialog(true); }}
            disabled={cart.length === 0 || createSaleMut.isPending}
            className="w-full h-12 text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {createSaleMut.isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin" />جارٍ الحفظ...</>
            ) : (
              <><CheckCircle2 className="h-5 w-5" />إتمام البيع — {formatPi(cartSubtotal)}π</>
            )}
          </Button>

          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />آخر المبيعات
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {recentSales.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد مبيعات سابقة</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {recentSales.map(function(sale) {
                    return (
                      <div key={sale.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sale.invoiceNumber}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {fmtTime(sale.createdAt)}
                            {sale.customer ? " — " + sale.customer.name : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-600">{formatPi(sale.total)}π</span>
                          <button
                            onClick={function() { setReprintSale(sale); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="إعادة طباعة"
                          >
                            <Printer className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Customer Lookup Dialog ═══ */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">بحث عن زبون</DialogTitle>
            <DialogDescription className="text-xs">ابحث بالاسم أو رقم الهاتف</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="اسم أو هاتف..."
                value={customerSearch}
                onChange={function(e) { setCustomerSearch(e.target.value); }}
                className="pr-9 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1" style={{ scrollbarWidth: "thin" }}>
              {filteredCustomers.map(function(c) {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={function() {
                      setSelectedCustomerId(isSelected ? null : c.id);
                      if (!isSelected) setShowCustomerDialog(false);
                      setCustomerSearch("");
                    }}
                    className={"w-full text-right p-2.5 rounded-lg border transition-all text-sm " + (
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : "hover:bg-muted/50 border-transparent"
                    )}
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.phone}{c.totalOrders > 0 ? " — " + c.totalOrders + " طلب" : ""}</p>
                  </button>
                );
              })}
              {filteredCustomers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Confirm Sale Dialog ═══ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">تأكيد البيع</DialogTitle>
            <DialogDescription className="text-xs">مراجعة السلة قبل الإتمام</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {cart.map(function(item) {
                const itemTotal = roundPi(item.unitPrice * item.quantity);
                return (
                  <div key={item.productId} className="flex justify-between text-xs py-1 border-b border-dashed last:border-0">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="font-bold">{formatPi(itemTotal)}π</span>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-sm">
              <span>المجموع</span>
              <span className="text-emerald-600">{formatPi(cartSubtotal)}π</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>طريقة الدفع</span>
              <span>{paymentLabel(paymentMethod)}</span>
            </div>
            {selectedCustomerName && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>الزبون</span>
                <span>{selectedCustomerName}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={function() { setShowConfirmDialog(false); }} disabled={createSaleMut.isPending}>إلغاء</Button>
            <Button size="sm" onClick={function() { createSaleMut.mutate(); }} disabled={createSaleMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              {createSaleMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Print Dialog ═══ */}
      <Dialog open={showPrintDialog} onOpenChange={function(open) { setShowPrintDialog(open); if (!open) setLastCompletedSale(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">تم البيع بنجاح ✅</DialogTitle>
            <DialogDescription className="text-xs">هل تريد طباعة الإيصال؟</DialogDescription>
          </DialogHeader>
          {lastCompletedSale && (
            <div className="text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-lg">{lastCompletedSale.invoiceNumber}</p>
                <p className="text-2xl font-bold text-emerald-600">{formatPi(lastCompletedSale.total)}π</p>
                <p className="text-xs text-muted-foreground mt-1">{paymentLabel(lastCompletedSale.paymentMethod)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={function() { setShowPrintDialog(false); setLastCompletedSale(null); }}>لا، شكراً</Button>
            <Button size="sm" onClick={function() { window.print(); }} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Reprint Dialog ═══ */}
      <Dialog open={!!reprintSale} onOpenChange={function(open) { if (!open) setReprintSale(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">طباعة الإيصال</DialogTitle>
            <DialogDescription className="text-xs">{reprintSale ? reprintSale.invoiceNumber : ""}</DialogDescription>
          </DialogHeader>
          {reprintSale && (
            <InvoicePrintView sale={reprintSale} store={store} onClose={function() { setReprintSale(null); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
