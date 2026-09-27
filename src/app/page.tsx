"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePiAuth } from "@/hooks/use-pi-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPiPayment, type PiPaymentData, type PiPaymentCallbacks } from "@/lib/pi-sdk";
import { api, setAccessToken } from "@/lib/api-client";
import {
  Shield, BarChart3, Package, FileText, ShoppingCart,
  Settings, Zap, CircleDot, Sun, Moon, Copy, Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { copyText } from "@/lib/helpers";
import { roundPi } from "@/lib/pi-amount";
import { DEMO_MODE, DEMO_USER } from "@/lib/constants";
import type { StoreData, ProductData, InvoiceData } from "@/lib/types";

/* ═══ Extracted Components ═══ */
import { FullPageLoader, PiBrowserRequired, LoginScreen } from "@/components/auth-screens";
import { StoreSetup } from "@/components/store-setup";
import { DashboardView } from "@/components/dashboard-view";
import { ProductsView } from "@/components/products-view";
import { InvoicesView } from "@/components/invoices-view";
import { OrdersView } from "@/components/orders-view";
import { SettingsView } from "@/components/settings-view";
import { PiSetupView } from "@/components/pi-setup-view";
import { BuyerInvoiceView } from "@/components/buyer-invoice-view";
import { StoreDirectoryView } from "@/components/store-directory-view";
import { StoreBuyerView } from "@/components/store-buyer-view";
import { ErrorBoundary } from "@/components/error-boundary";

/* ═══ App Entry ═══ */
export default function LedgererpApp() {
  const searchParams = useSearchParams();
  const invoiceParam = searchParams.get("invoice");
  const storeParam = searchParams.get("store");
  const storesParam = searchParams.has("stores");

  // ?invoice=INV-xxx → Buyer invoice view (no auth required)
  if (invoiceParam) {
    return <BuyerInvoiceView invoiceNumber={invoiceParam} />;
  }

  // ?store=storeId → Store buyer view (no auth required)
  if (storeParam) {
    return <StoreBuyerView storeId={storeParam} />;
  }

  // ?stores → Store directory (no auth required)
  if (storesParam) {
    return <StoreDirectoryView />;
  }

  return <ErrorBoundary><SellerApp /></ErrorBoundary>;
}

/* ═══ Seller App (authenticated) ═══ */
function SellerApp() {
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
  const { theme, setTheme } = useTheme();
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
  const stores = ((storesRes.data as Record<string, unknown>)?.data || []) as StoreData[];

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
    queryFn: function() { return api.get("/api/invoices?storeId=" + myStore!.id + "&page=1&limit=100", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const customerInvRes = useQuery({
    queryKey: ["invoices", "customer", piUid],
    queryFn: function() { return api.get("/api/invoices?customerPiUid=" + piUid + "&page=1&limit=100", piUid).then(function(r) { return r.json(); }); },
    staleTime: 30_000,
  });

  /* Payment status polling — refresh every 15s when there are active invoices, every 60s otherwise */
  useEffect(function() {
    const merchantInvoices = ((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
    const hasActiveInvoices = merchantInvoices.some(function(inv) {
      return inv.status === "pending" || inv.status === "paid_escrow" || inv.status === "shipped" || inv.status === "delivered";
    });

    const intervalMs = hasActiveInvoices ? 15_000 : 60_000;

    const interval = setInterval(function() {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    }, intervalMs);

    return function() { clearInterval(interval); };
  }, [merchantInvRes.data, qc]);

  /* Products */
  const productsRes = useQuery({
    queryKey: ["products", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/products?storeId=" + myStore!.id + "&page=1&limit=100", piUid).then(function(r) { return r.json(); }); },
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
    const mi = ((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
    const ci = ((customerInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
    const escrowed = mi.filter(function(inv) { return ["paid_escrow", "shipped", "delivered"].indexOf(inv.status) !== -1; });
    const disputed = mi.filter(function(inv) { return inv.status === "disputed"; });
    const cancelled = mi.filter(function(inv) { return inv.status === "cancelled"; });
    return {
      totalInvoices: mi.length,
      totalProducts: ((productsRes.data as Record<string, unknown>)?.data || [] as unknown[]).length,
      escrowedPi: roundPi(escrowed.reduce(function(s, inv) { return s + inv.total; }, 0)),
      completedPi: roundPi(mi.filter(function(inv) { return inv.status === "completed"; }).reduce(function(s, inv) { return s + inv.subtotal; }, 0)),
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
  // Buyer confirms delivery — uses public buyer-action endpoint (no store ownership required)
  const handleConfirm = useCallback(function(inv: InvoiceData) {
    api.post("/api/invoices/buyer-action", { invoiceId: inv.id, action: "confirmDelivery" }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم تأكيد التسليم ✅" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل تأكيد التسليم", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  }, [qc, toast, piUid]);
  const handleDispute = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "disputed" }); toast({ title: "تم فتح نزاع" }); }, [updateInvoiceMut, toast]);
  const handleCancel = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "cancelled" }); toast({ title: "تم إلغاء الطلب" }); }, [updateInvoiceMut, toast]);

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-emerald-600 focus:text-white focus:rounded-md focus:text-sm">
        تخطي إلى المحتوى
      </a>
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
            {/* Active invoices notification bell */}
            {function() {
              const mi = ((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
              const activeCount = mi.filter(function(inv) { return inv.status === "paid_escrow" || inv.status === "shipped" || inv.status === "delivered"; }).length;
              return activeCount > 0 ? (
                <button className="relative p-1.5 rounded-md hover:bg-muted" onClick={function() { setTab("orders"); }} aria-label={activeCount + " طلبات نشطة"}>
                  <Bell className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center font-bold">{activeCount > 9 ? "9+" : activeCount}</span>
                </button>
              ) : null;
            }()}
            <Badge variant="outline" className="text-xs gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CircleDot className="h-3 w-3" />{username}
            </Badge>
            <button className="p-1.5 rounded-md hover:bg-muted" onClick={function() { setTheme(theme === "dark" ? "light" : "dark"); }} aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}>
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-muted-foreground" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button className="p-1.5 rounded-md hover:bg-muted" onClick={function() { copyText(piUid, toast, "تم نسخ المعرف"); }} aria-label="نسخ المعرف">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">
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
                    <Ic className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t[2] as string}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="dashboard"><DashboardView stats={stats} store={myStore} /></TabsContent>
            <TabsContent value="products"><ProductsView products={((productsRes.data as Record<string, unknown>)?.data || []) as ProductData[]} storeId={myStore.id} piUid={piUid} /></TabsContent>
            <TabsContent value="invoices"><InvoicesView store={myStore} products={((productsRes.data as Record<string, unknown>)?.data || []) as ProductData[]} piUid={piUid} /></TabsContent>
            <TabsContent value="orders">
              <OrdersView
                merchantInvoices={((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[]}
                customerInvoices={((customerInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[]}
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
