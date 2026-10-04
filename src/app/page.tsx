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
  ShoppingBag, LogOut, Warehouse, Users, Wallet, TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { copyText } from "@/lib/helpers";
import { roundPi } from "@/lib/pi-amount";
import { DEMO_MODE, DEMO_USER } from "@/lib/constants";
import type { StoreData, ProductData, InvoiceData, CategoryData, InventoryData, CustomerData, LocalSaleData, ExpenseData, TransactionLogData } from "@/lib/types";

/* ═══ Extracted Components ═══ */
import { FullPageLoader, PiBrowserRequired, LoginScreen } from "@/components/auth-screens";
import { StoreSetup, type ConnectStoreData } from "@/components/store-setup";
import { DashboardView } from "@/components/dashboard-view";
import { ProductsView } from "@/components/products-view";
import { SalesView } from "@/components/sales-view";
import { OrdersView } from "@/components/orders-view";
import { InventoryView } from "@/components/inventory-view";
import { CustomersView } from "@/components/customers-view";
import { ExpensesView } from "@/components/expenses-view";
import { SettingsView } from "@/components/settings-view";
import { PiSetupView } from "@/components/pi-setup-view";
import { BuyerInvoiceView } from "@/components/buyer-invoice-view";
import { StoreDirectoryView } from "@/components/store-directory-view";
import { StoreBuyerView } from "@/components/store-buyer-view";
import { ErrorBoundary } from "@/components/error-boundary";
import { MerchantBuyerView } from "@/components/merchant-buyer-view";

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

  /* Payment status polling */
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
  const products = ((productsRes.data as Record<string, unknown>)?.data || []) as ProductData[];

  /* Categories */
  const categoriesRes = useQuery({
    queryKey: ["categories"],
    queryFn: function() { return api.get("/api/categories?active=true", piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });
  const categories = ((categoriesRes.data as Record<string, unknown>)?.data || []) as CategoryData[];

  /* Inventory */
  const inventoryRes = useQuery({
    queryKey: ["inventory", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/inventory?storeId=" + myStore!.id + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const inventory = ((inventoryRes.data as Record<string, unknown>)?.data || []) as InventoryData[];

  /* Customers */
  const customersRes = useQuery({
    queryKey: ["customers", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/customers?storeId=" + myStore!.id + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const customers = ((customersRes.data as Record<string, unknown>)?.data || []) as CustomerData[];

  /* Local Sales */
  const localSalesRes = useQuery({
    queryKey: ["localSales", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/local-sales?storeId=" + myStore!.id + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const localSales = ((localSalesRes.data as Record<string, unknown>)?.data || []) as LocalSaleData[];

  /* Expenses */
  const expensesRes = useQuery({
    queryKey: ["expenses", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/expenses?storeId=" + myStore!.id + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const expenses = ((expensesRes.data as Record<string, unknown>)?.data || []) as ExpenseData[];

  /* Expenses Stats */
  const expensesStatsRes = useQuery({
    queryKey: ["expenses-stats", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/expenses?storeId=" + myStore!.id + "&stats=true", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });

  /* Transaction Logs */
  const txLogsRes = useQuery({
    queryKey: ["transaction-logs", myStore ? myStore.id : ""],
    queryFn: function() { return api.get("/api/transaction-logs?storeId=" + myStore!.id + "&limit=20", piUid).then(function(r) { return r.json(); }); },
    enabled: !!myStore && !!myStore.id,
    staleTime: 30_000,
  });
  const transactionLogs = ((txLogsRes.data as Record<string, unknown>)?.data || []) as TransactionLogData[];

  /* Mutations */
  const createStoreMut = useMutation({
    mutationFn: function(data: { piUid: string; name: string; description: string; avatar?: string; source?: string; piAppUrl?: string; products?: { name: string; price: number; description: string }[] }) {
      return api.post("/api/stores", data, piUid).then(function(r) { return r.json(); });
    },
    onSuccess: function(data) { setCreatedStore(data); qc.invalidateQueries({ queryKey: ["stores"] }); const imported = (data as Record<string, unknown>)._importedProducts as number || 0; toast({ title: imported > 0 ? "تم إنشاء المتجر واستيراد " + imported + " منتج" : "تم إنشاء المتجر بنجاح" }); try { localStorage.setItem("ledgererp_store", JSON.stringify(data)); } catch {} },
    onError: function() { toast({ title: "فشل إنشاء المتجر", variant: "destructive" }); },
  });

  /* Connect existing Pi store */
  const handleConnectStore = useCallback(function(data: ConnectStoreData) {
    createStoreMut.mutate({
      piUid: piUid,
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      source: "pi_connected",
      piAppUrl: data.piAppUrl,
      products: data.products,
    });
  }, [createStoreMut, piUid]);

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

  /* Stats — Enhanced with all new data */
  const stats = useMemo(function() {
    const mi = ((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
    const ci = ((customerInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
    const escrowed = mi.filter(function(inv) { return ["paid_escrow", "shipped", "delivered"].indexOf(inv.status) !== -1; });
    const completedPi = roundPi(mi.filter(function(inv) { return inv.status === "completed"; }).reduce(function(s, inv) { return s + inv.subtotal; }, 0));
    const localSalesRevenue = roundPi(localSales.reduce(function(s, sale) { return s + sale.total; }, 0));
    const totalExpenses = roundPi(expenses.reduce(function(s, exp) { return s + exp.amount; }, 0));
    const lowStockCount = inventory.filter(function(inv) { return inv.isLowStock; }).length;

    return {
      totalInvoices: mi.length,
      totalProducts: products.length,
      escrowedPi: roundPi(escrowed.reduce(function(s, inv) { return s + inv.total; }, 0)),
      completedPi: completedPi,
      localSalesRevenue: localSalesRevenue,
      totalExpenses: totalExpenses,
      totalCustomers: customers.length,
      lowStockCount: lowStockCount,
      myOrders: ci.length,
      disputedCount: mi.filter(function(inv) { return inv.status === "disputed"; }).length,
      cancelledCount: mi.filter(function(inv) { return inv.status === "cancelled"; }).length,
      recentOrders: mi.slice(0, 5),
    };
  }, [merchantInvRes.data, customerInvRes.data, products, localSales, expenses, customers, inventory]);

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
  const handleConfirm = useCallback(function(inv: InvoiceData) {
    api.post("/api/invoices/buyer-action", { invoiceId: inv.id, action: "confirmDelivery" }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم تأكيد التسليم ✅" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل تأكيد التسليم", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  }, [qc, toast, piUid]);
  const handleDispute = useCallback(function(inv: InvoiceData) {
    api.post("/api/invoices/buyer-action", { invoiceId: inv.id, action: "dispute", reason: "" }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم فتح نزاع" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل فتح النزاع", description: err.error || "", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  }, [qc, toast, piUid]);
  const handleCancel = useCallback(function(inv: InvoiceData) { updateInvoiceMut.mutate({ id: inv.id, status: "cancelled" }); toast({ title: "تم إلغاء الطلب" }); }, [updateInvoiceMut, toast]);

  /* ── 10 Tabs ── */
  const tabList = [
    ["dashboard", BarChart3, "الرئيسية"],
    ["products", Package, "المنتجات"],
    ["inventory", Warehouse, "المخزون"],
    ["sales", FileText, "المبيعات"],
    ["orders", ShoppingCart, "الطلبات"],
    ["customers", Users, "الزبائن"],
    ["expenses", TrendingDown, "المصروفات"],
    ["shop", ShoppingBag, "تسوق"],
    ["settings", Settings, "الإعدادات"],
    ["pisetup", Zap, "إعداد Pi"],
  ] as const;

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
            <button className="p-1.5 rounded-md hover:bg-muted" onClick={function() { try { localStorage.removeItem("ledgererp_store"); } catch {} window.location.reload(); }} aria-label="تسجيل الخروج">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 space-y-5">
        {storesRes.isLoading && !myStore ? (
          <div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full rounded-xl" /></div>
        ) : !myStore ? (
          <StoreSetup
            onCreate={function(n, d, a) { createStoreMut.mutate({ piUid: piUid, name: n, description: d, avatar: a, source: "ledgererp" }); }}
            onConnect={handleConnectStore}
            loading={createStoreMut.isPending}
            username={username}
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-5">
            <TabsList className="grid grid-cols-5 sm:grid-cols-10 w-full h-auto p-1 bg-muted/50">
              {tabList.map(function(t) {
                const Ic = t[1] as React.ElementType;
                return (
                  <TabsTrigger key={t[0] as string} value={t[0] as string} className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1">
                    <Ic className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t[2] as string}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* 1. Dashboard */}
            <TabsContent value="dashboard">
              <DashboardView stats={stats} store={myStore} transactionLogs={transactionLogs} inventory={inventory} />
            </TabsContent>

            {/* 2. Products */}
            <TabsContent value="products">
              <ProductsView products={products} storeId={myStore.id} piUid={piUid} categories={categories} inventory={inventory} />
            </TabsContent>

            {/* 3. Inventory */}
            <TabsContent value="inventory">
              <InventoryView storeId={myStore.id} piUid={piUid} />
            </TabsContent>

            {/* 4. Sales (merged Pi invoices + local sales) */}
            <TabsContent value="sales">
              <SalesView store={myStore} products={products} piUid={piUid} customers={customers} localSales={localSales} inventory={inventory} />
            </TabsContent>

            {/* 5. Orders */}
            <TabsContent value="orders">
              <OrdersView
                merchantInvoices={((merchantInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[]}
                customerInvoices={((customerInvRes.data as Record<string, unknown>)?.data || []) as InvoiceData[]}
                store={myStore} customerUid={piUid}
                onPay={payWithPi} onShip={handleShip}
                onConfirmDelivery={handleConfirm} onRelease={handleRelease}
                onDispute={handleDispute} onCancel={handleCancel}
                onRefresh={function() { qc.invalidateQueries({ queryKey: ["invoices"] }); }}
              />
            </TabsContent>

            {/* 6. Customers */}
            <TabsContent value="customers">
              <CustomersView storeId={myStore.id} piUid={piUid} />
            </TabsContent>

            {/* 7. Expenses */}
            <TabsContent value="expenses">
              <ExpensesView storeId={myStore.id} piUid={piUid} />
            </TabsContent>

            {/* 8. Shop */}
            <TabsContent value="shop">
              <MerchantBuyerView
                buyerPiUid={piUid}
                buyerName={username}
                ownStoreId={myStore.id}
                onPay={payWithPi}
                onViewOrders={function() { setTab("orders"); }}
              />
            </TabsContent>

            {/* 9. Settings */}
            <TabsContent value="settings">
              <SettingsView store={myStore} onUpdate={function(d) { updateStoreMut.mutate(d); }} onDelete={function() { deleteStoreMut.mutate(myStore.id); }} updating={updateStoreMut.isPending} deleting={deleteStoreMut.isPending} piUid={piUid} />
            </TabsContent>

            {/* 10. Pi Setup */}
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
          <span>v3.0</span>
        </div>
      </footer>
    </div>
  );
}
