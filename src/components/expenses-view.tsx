"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, Plus, Search, Loader2, Trash2, TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { fmtDate } from "@/lib/helpers";
import type { ExpenseData } from "@/lib/types";

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "إيجار", icon: "🏠" },
  { value: "utilities", label: "مرافق", icon: "💡" },
  { value: "salaries", label: "رواتب", icon: "👷" },
  { value: "supplies", label: "مستلزمات", icon: "📦" },
  { value: "marketing", label: "تسويق", icon: "📢" },
  { value: "shipping", label: "شحن", icon: "🚚" },
  { value: "other", label: "أخرى", icon: "📌" },
];

function getCategoryInfo(cat: string) {
  return EXPENSE_CATEGORIES.find(function(c) { return c.value === cat; }) || { value: cat, label: cat, icon: "📌" };
}

/* ═══ Expenses ═══ */
export function ExpensesView({ storeId, piUid }: { storeId: string; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ExpenseData | null>(null);

  // Form
  const [formCategory, setFormCategory] = useState("rent");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));

  const expRes = useQuery({
    queryKey: ["expenses", storeId],
    queryFn: function() { return api.get("/api/expenses?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const expenses = ((expRes.data as Record<string, unknown>)?.data || []) as ExpenseData[];

  const statsRes = useQuery({
    queryKey: ["expenses-stats", storeId],
    queryFn: function() { return api.get("/api/expenses?storeId=" + storeId + "&stats=true", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const stats = (statsRes.data as Record<string, unknown>) || {};

  const filtered = categoryFilter === "all" ? expenses : expenses.filter(function(e) { return e.category === categoryFilter; });

  const thisMonth = expenses.filter(function(e) {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = roundPi(thisMonth.reduce(function(s, e) { return s + e.amount; }, 0));

  const handleAdd = function() {
    if (!formDesc.trim() || !formAmount || parseFloat(formAmount) <= 0) return;
    setSaving(true);
    api.post("/api/expenses", { storeId: storeId, category: formCategory, description: formDesc.trim(), amount: parseFloat(formAmount), date: formDate }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["expenses", storeId] });
        qc.invalidateQueries({ queryKey: ["expenses-stats", storeId] });
        setOpen(false);
        setFormDesc("");
        setFormAmount("");
        setFormDate(new Date().toISOString().slice(0, 10));
        setFormCategory("rent");
        toast({ title: "تم إضافة المصروف" });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل الإضافة", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleDelete = function(id: string) {
    api.delete("/api/expenses", { id: id }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["expenses", storeId] }); qc.invalidateQueries({ queryKey: ["expenses-stats", storeId] }); toast({ title: "تم حذف المصروف" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-base">المصروفات</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />مصروف جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">إضافة مصروف</DialogTitle><DialogDescription className="text-xs">سجّل مصروفاً جديداً</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">التصنيف *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(function(cat) { return <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.icon} {cat.label}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف *</Label><Input value={formDesc} onChange={function(e) { setFormDesc(e.target.value); }} placeholder="مثال: إيجار المحل" className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">المبلغ (π) *</Label><Input type="number" step="0.01" inputMode="decimal" value={formAmount} onChange={function(e) { setFormAmount(e.target.value); }} placeholder="0.00" className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">التاريخ</Label><Input type="date" value={formDate} onChange={function(e) { setFormDate(e.target.value); }} className="text-sm" dir="ltr" /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={!formDesc.trim() || !formAmount || parseFloat(formAmount) <= 0 || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><TrendingDown className="h-4 w-4 text-red-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">إجمالي المصروفات</p><p className="font-bold text-sm">{formatPi(Number(stats.totalAmount || 0))} π</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-amber-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">هذا الشهر</p><p className="font-bold text-sm">{formatPi(thisMonthTotal)} π</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-emerald-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">عدد المصروفات</p><p className="font-bold text-sm">{expenses.length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3.5 px-4"><CardTitle className="text-xs font-bold">توزيع حسب التصنيف</CardTitle></CardHeader>
          <CardContent className="pb-3.5 px-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map(function(cat) {
                const amount = Number((stats.byCategory as Record<string, unknown>)[cat.value] || 0);
                if (amount === 0) return null;
                return (
                  <div key={cat.value} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-base">{cat.icon}</span>
                    <div><p className="text-[10px] text-muted-foreground">{cat.label}</p><p className="text-xs font-bold">{formatPi(amount)} π</p></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="جميع التصنيفات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">جميع التصنيفات</SelectItem>
            {EXPENSE_CATEGORIES.map(function(cat) { return <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.icon} {cat.label}</SelectItem>; })}
          </SelectContent>
        </Select>
      </div>

      {/* Expense List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">لا توجد مصروفات</p>
          <p className="text-xs text-muted-foreground/70 mt-1">سجّل أول مصروف</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto">
          {filtered.map(function(exp) {
            const catInfo = getCategoryInfo(exp.category);
            return (
              <Card key={exp.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 text-base">{catInfo.icon}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{catInfo.label}</Badge>
                        <span>{fmtDate(exp.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-xs text-red-500">{formatPi(exp.amount)} π</span>
                    <button onClick={function() { setDeleteTarget(exp); }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3 w-3 text-red-400" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={function(o) { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المصروف</AlertDialogTitle><AlertDialogDescription className="text-xs">{deleteTarget ? "هل أنت متأكد من حذف «" + deleteTarget.description + "»؟" : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { if (deleteTarget) { handleDelete(deleteTarget.id); setDeleteTarget(null); } }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
