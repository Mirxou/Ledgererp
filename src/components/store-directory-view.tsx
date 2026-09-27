"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, Search, Store, Package, ChevronLeft,
  CheckCircle2, MapPin, Link2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/use-debounce";
import type { StoreData } from "@/lib/types";

/* ═══ Component Props ═══ */
interface StoreDirectoryViewProps {
  onBack?: () => void;
}

/* ═══ Store Directory View ═══ */
export function StoreDirectoryView({ onBack }: StoreDirectoryViewProps) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  /* ── Fetch all stores (public) ── */
  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/stores?limit=200");
      if (!res.ok) {
        setError("فشل في تحميل المتاجر");
        return;
      }
      const json = await res.json();
      setStores((json.data || []) as StoreData[]);
    } catch {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  /* ── Filter stores by search ── */
  const filteredStores = React.useMemo(() => {
    if (!debouncedSearch.trim()) return stores;
    const q = debouncedSearch.trim().toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [stores, debouncedSearch]);

  /* ── Navigate to store ── */
  const visitStore = useCallback((storeId: string) => {
    window.location.href = `${window.location.pathname}?store=${storeId}`;
  }, []);

  /* ═══ Loading State ═══ */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
        <StoreDirectoryHeader onBack={onBack} search={search} onSearchChange={setSearch} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
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
        </main>
      </div>
    );
  }

  /* ═══ Error State ═══ */
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
        <StoreDirectoryHeader onBack={onBack} search={search} onSearchChange={setSearch} />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Store className="h-6 w-6 text-red-500" />
            </div>
            <p className="font-semibold">{error}</p>
            <Button variant="outline" onClick={fetchStores} className="gap-2">
              إعادة المحاولة
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <StoreDirectoryHeader onBack={onBack} search={search} onSearchChange={setSearch} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
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

        {/* Empty State */}
        {filteredStores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-lg mb-1">
              {debouncedSearch ? "لا توجد نتائج" : "لا توجد متاجر بعد"}
            </p>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "جرب البحث بكلمات مختلفة"
                : "لم يتم تسجيل أي متجر بعد. كن أول من ينشئ متجره!"}
            </p>
          </div>
        )}

        {/* Store Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store) => {
            const productCount = store._count?.products || 0;
            const isActive = productCount > 0;

            return (
              <Card
                key={store.id}
                className="group hover:shadow-md transition-shadow cursor-pointer border-border/60"
                onClick={() => visitStore(store.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {store.avatar ? (
                      <img
                        src={store.avatar}
                        alt={store.name}
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
                          {store.name}
                        </CardTitle>
                        {store.isVerified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                        {store.source === "pi_connected" && (
                          <Badge className="text-[8px] px-1 py-0 h-3.5 bg-teal-500/15 text-teal-600 border-teal-500/20 border">
                            <Link2 className="h-2.5 w-2.5 ml-0.5" />Pi
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
                    {store.description || "لا يوجد وصف"}
                  </CardDescription>
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      visitStore(store.id);
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
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-3 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Ledgererp — ابحث تجد أسواق جاهزة</span>
          <span>v2.0</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══ Header Sub-Component ═══ */
function StoreDirectoryHeader({
  onBack,
  search,
  onSearchChange,
}: {
  onBack?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Back button */}
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <h1 className="font-bold text-base tracking-tight hidden sm:block">دليل المتاجر</h1>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث عن متجر..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-9 h-9 text-sm"
          />
        </div>
      </div>
    </header>
  );
}
