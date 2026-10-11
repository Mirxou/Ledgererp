"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Package, Search, Loader2, Pencil, Trash2, AlertTriangle,
  LayoutGrid, List, Download, Minus, CheckSquare, Square,
  Power, PowerOff, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { formatPi } from "@/lib/pi-amount";
import type { ProductData, CategoryData, InventoryData } from "@/lib/types";

/* ═══ Products ═══ */
export function ProductsView({ products, storeId, piUid, categories, inventory }: { products: ProductData[]; storeId: string; piUid: string; categories: CategoryData[]; inventory?: InventoryData[] }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", costPrice: "", image: "", sku: "", categoryId: "none", unit: "unit" });
  const [editForm, setEditForm] = useState<ProductData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "available" | "out" | "low">("all");
  const [deleteTarget, setDeleteTarget] = useState<ProductData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleAdd = function() {
    if (!form.name.trim() || !form.price) return;
    const priceVal = parseFloat(form.price);
    if (isNaN(priceVal) || priceVal <= 0) { toast({ title: "السعر يجب أن يكون رقماً أكبر من صفر", variant: "destructive" }); return; }
    setSaving(true);
    const body: Record<string, unknown> = {
      storeId: storeId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: priceVal,
      image: form.image.trim(),
      sku: form.sku.trim(),
      costPrice: parseFloat(form.costPrice) || 0,
      unit: form.unit,
      categoryId: form.categoryId === "none" ? null : form.categoryId,
    };
    api.post("/api/products", body, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setOpen(false); setForm({ name: "", description: "", price: "", costPrice: "", image: "", sku: "", categoryId: "none", unit: "unit" }); toast({ title: "تم إضافة المنتج" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل الإضافة", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleEdit = function() {
    if (!editForm || !editForm.name.trim()) return;
    setSaving(true);
    const ef = editForm;
    api.patch("/api/products", { id: ef.id, name: ef.name.trim(), description: ef.description.trim(), price: ef.price, costPrice: ef.costPrice, sku: ef.sku, unit: ef.unit, categoryId: ef.categoryId, isActive: ef.isActive }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setEditOpen(false); setEditForm(null); toast({ title: "تم تحديث المنتج" }); }
      else { toast({ title: "فشل التحديث", variant: "destructive" }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleDelete = function(id: string) {
    api.delete("/api/products", { id: id }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: "تم حذف المنتج" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  const handleToggle = function(p: ProductData) {
    api.patch("/api/products", { id: p.id, isActive: !p.isActive }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: p.isActive ? "تم تعطيل المنتج" : "تم تفعيل المنتج" }); }
      else toast({ title: "فشل التحديث", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  /* ─── Batch Operations ─── */
  const toggleSelect = function(id: string) {
    setSelectedIds(function(prev) {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = function() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(function(p) { return p.id; })));
    }
  };

  const handleBatchActivate = function(val: boolean) {
    setBatchLoading(true);
    const ids = Array.from(selectedIds);
    Promise.all(ids.map(function(id) {
      return api.patch("/api/products", { id: id, isActive: val }, piUid);
    })).then(function(results) {
      const ok = results.every(function(r) { return r.ok; });
      if (ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setSelectedIds(new Set()); toast({ title: val ? "تم تفعيل المنتجات المحددة" : "تم تعطيل المنتجات المحددة" }); }
      else { toast({ title: "فشل في بعض التحديثات", variant: "destructive" }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setBatchLoading(false); });
  };

  const handleBatchDelete = function() {
    setBatchLoading(true);
    const ids = Array.from(selectedIds);
    Promise.all(ids.map(function(id) {
      return api.delete("/api/products", { id: id }, piUid);
    })).then(function(results) {
      const ok = results.every(function(r) { return r.ok; });
      if (ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); setSelectedIds(new Set()); setBatchDeleteOpen(false); toast({ title: "تم حذف المنتجات المحددة" }); }
      else { toast({ title: "فشل في بعض الحذف", variant: "destructive" }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setBatchLoading(false); });
  };

  /* ─── Inventory Quick Adjust ─── */
  const handleStockAdjust = function(p: ProductData, delta: number) {
    const inv = getProductInventory(p.id);
    if (inv) {
      const newQty = Math.max(0, inv.quantity + delta);
      api.patch("/api/inventory", { id: inv.id, quantity: newQty, storeId: storeId }, piUid).then(function(res) {
        if (res.ok) { qc.invalidateQueries({ queryKey: ["inventory", storeId] }); qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: delta > 0 ? "تم زيادة المخزون" : "تم تقليل المخزون" }); }
        else { toast({ title: "فشل تحديث المخزون", variant: "destructive" }); }
      }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
    } else {
      api.patch("/api/products", { id: p.id, stockQuantity: Math.max(0, p.stockQuantity + delta) }, piUid).then(function(res) {
        if (res.ok) { qc.invalidateQueries({ queryKey: ["products", storeId] }); toast({ title: delta > 0 ? "تم زيادة المخزون" : "تم تقليل المخزون" }); }
        else { toast({ title: "فشل تحديث المخزون", variant: "destructive" }); }
      }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
    }
  };

  /* ─── CSV Export ─── */
  const handleExportCSV = function() {
    const header = "الاسم,SKU,السعر,المخزون,التصنيف,نشط\n";
    const catMap: Record<string, string> = {};
    categories.forEach(function(c) { catMap[c.id] = c.nameAr; });
    const rows = filtered.map(function(p) {
      return '"' + p.name.replace(/"/g, '""') + '",' + (p.sku || "") + "," + p.price + "," + (getAvailableStock(p) !== null ? getAvailableStock(p) : p.stockQuantity) + ',"' + (p.categoryId && catMap[p.categoryId] ? catMap[p.categoryId] : "") + '",' + (p.isActive ? "نعم" : "لا");
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير المنتجات" });
  };

  const debouncedSearch = useDebounce(search, 250);
  const filtered = products.filter(function(p) {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchName = p.name.toLowerCase().indexOf(q) !== -1;
      const matchSku = p.sku && p.sku.toLowerCase().indexOf(q) !== -1;
      if (!matchName && !matchSku) return false;
    }
    if (stockFilter !== "all") {
      const avail = getAvailableStock(p);
      const stock = avail !== null ? avail : p.stockQuantity;
      if (stockFilter === "available" && stock <= 0) return false;
      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "low" && !isLowStock(p)) return false;
    }
    return true;
  });

  const getCategoryName = function(categoryId: string | null) {
    if (!categoryId) return null;
    const cat = categories.find(function(c) { return c.id === categoryId; });
    return cat ? cat.nameAr : null;
  };

  const getProductInventory = function(productId: string): InventoryData | null {
    if (!inventory) return null;
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].productId === productId) return inventory[i];
    }
    return null;
  };

  const isLowStock = function(p: ProductData) {
    const inv = getProductInventory(p.id);
    if (inv) {
      const avail = inv.availableQuantity !== undefined ? inv.availableQuantity : inv.quantity - inv.reservedQuantity;
      return inv.trackInventory && avail <= inv.lowStockThreshold;
    }
    return p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
  };

  const getAvailableStock = function(p: ProductData): number | null {
    const inv = getProductInventory(p.id);
    if (!inv) return null;
    return inv.availableQuantity !== undefined ? inv.availableQuantity : inv.quantity - inv.reservedQuantity;
  };

  const getReservedStock = function(p: ProductData): number {
    const inv = getProductInventory(p.id);
    return inv ? inv.reservedQuantity : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث عن منتج أو SKU..." className="text-sm pr-9" /></div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 text-xs shrink-0"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">الكل</SelectItem>
            {categories.map(function(c) { return <SelectItem key={c.id} value={c.id} className="text-xs">{c.nameAr}</SelectItem>; })}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={function(v) { setStockFilter(v as typeof stockFilter); }}>
          <SelectTrigger className="w-28 text-xs shrink-0"><SelectValue placeholder="المخزون" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">الكل</SelectItem>
            <SelectItem value="available" className="text-xs">متوفر</SelectItem>
            <SelectItem value="out" className="text-xs">نفد</SelectItem>
            <SelectItem value="low" className="text-xs">منخفض</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border rounded-md overflow-hidden shrink-0">
          <Button variant="ghost" size="sm" className={"h-7 w-7 p-0 rounded-none " + (viewMode === "table" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "text-muted-foreground")} onClick={function() { setViewMode("table"); }}><List className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className={"h-7 w-7 p-0 rounded-none " + (viewMode === "grid" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "text-muted-foreground")} onClick={function() { setViewMode("grid"); }}><LayoutGrid className="h-3.5 w-3.5" /></Button>
        </div>
        {filtered.length > 0 && (
          <Button variant="outline" size="sm" className="text-xs shrink-0 h-7" onClick={handleExportCSV}><Download className="h-3.5 w-3.5 ml-1" />تصدير CSV</Button>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />إضافة</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-sm">منتج جديد</DialogTitle><DialogDescription className="text-xs">أضف منتجاً لمتجرك</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} placeholder="اسم المنتج" className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} placeholder="وصف مختصر" className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">سعر البيع (Pi) *</Label><Input type="number" step="0.01" inputMode="decimal" value={form.price} onChange={function(e) { setForm(Object.assign({}, form, { price: e.target.value })); }} placeholder="0.00" className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">سعر التكلفة (Pi)</Label><Input type="number" step="0.01" inputMode="decimal" value={form.costPrice} onChange={function(e) { setForm(Object.assign({}, form, { costPrice: e.target.value })); }} placeholder="0.00" className="text-sm" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={form.sku} onChange={function(e) { setForm(Object.assign({}, form, { sku: e.target.value })); }} placeholder="PRD-001" className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">الوحدة</Label>
                  <Select value={form.unit} onValueChange={function(v) { setForm(Object.assign({}, form, { unit: v })); }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit" className="text-xs">وحدة</SelectItem>
                      <SelectItem value="kg" className="text-xs">كيلوغرام</SelectItem>
                      <SelectItem value="liter" className="text-xs">لتر</SelectItem>
                      <SelectItem value="piece" className="text-xs">قطعة</SelectItem>
                      <SelectItem value="box" className="text-xs">صندوق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">التصنيف</Label>
                <Select value={form.categoryId} onValueChange={function(v) { setForm(Object.assign({}, form, { categoryId: v })); }}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="بدون تصنيف" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">بدون تصنيف</SelectItem>
                    {categories.map(function(c) { return <SelectItem key={c.id} value={c.id} className="text-xs">{c.nameAr}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">رابط الصورة (اختياري)</Label><Input value={form.image} onChange={function(e) { setForm(Object.assign({}, form, { image: e.target.value })); }} placeholder="https://..." className="text-sm" dir="ltr" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={!form.name.trim() || !form.price || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        search || stockFilter !== "all" || categoryFilter !== "all" ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد نتائج</p>
            <p className="text-xs text-muted-foreground/70 mt-1">جرب بحثاً آخر أو غيّر الفلتر</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد منتجات بعد</p>
            <p className="text-xs text-muted-foreground/70 mt-1">أضف أول منتج لمتجرك</p>
          </div>
        )
      ) : viewMode === "table" ? (
        /* ─── TABLE VIEW ─── */
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-9 pr-0">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                </TableHead>
                <TableHead className="text-xs">المنتج</TableHead>
                <TableHead className="text-xs text-center">السعر</TableHead>
                <TableHead className="text-xs text-center">المخزون</TableHead>
                <TableHead className="text-xs text-center">الحالة</TableHead>
                <TableHead className="text-xs text-center w-20">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(function(p) {
                const catName = getCategoryName(p.categoryId);
                const lowStock = isLowStock(p);
                const avail = getAvailableStock(p);
                const stock = avail !== null ? avail : p.stockQuantity;
                return (
                  <TableRow key={p.id} className={"group " + (selectedIds.has(p.id) ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "")}>
                    <TableCell className="pr-0">
                      <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={function() { toggleSelect(p.id); }} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.image && <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0" onError={function(e) { (e.target as HTMLImageElement).style.display = "none"; }} />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate cursor-pointer hover:text-emerald-600 transition-colors" onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }}>{p.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {p.sku && <span className="text-[9px] font-mono text-muted-foreground">{p.sku}</span>}
                            {catName && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-teal-500/10 text-teal-600 border-teal-500/20">{catName}</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge dir="ltr" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">{p.price} π</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.trackInventory && (
                          <>
                            <button onClick={function() { handleStockAdjust(p, -1); }} className="p-0.5 rounded hover:bg-muted transition-colors" aria-label="تقليل"><Minus className="h-3 w-3 text-muted-foreground" /></button>
                            <span className={"text-xs font-medium min-w-[20px] text-center " + (stock <= 0 ? "text-red-600" : lowStock ? "text-amber-600" : "text-emerald-600")}>{stock}</span>
                            <button onClick={function() { handleStockAdjust(p, 1); }} className="p-0.5 rounded hover:bg-muted transition-colors" aria-label="زيادة"><Plus className="h-3 w-3 text-muted-foreground" /></button>
                          </>
                        )}
                        {!p.trackInventory && <span className="text-xs text-muted-foreground">—</span>}
                        {lowStock && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-red-500/10 text-red-600 border-red-500/20 mr-1"><AlertTriangle className="h-2 w-2 ml-0.5" />منخفض</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <button onClick={function() { handleToggle(p); }} className={"text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer " + (p.isActive ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-zinc-500/30 text-zinc-500 bg-zinc-500/10")}>
                        {p.isActive ? "نشط" : "معطّل"}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }} className="p-1 rounded-md hover:bg-muted transition-colors" aria-label="تعديل"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                        <button onClick={function() { setDeleteTarget(p); }} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" aria-label="حذف"><Trash2 className="h-3 w-3 text-red-400" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ─── GRID VIEW ─── */
        <div className="space-y-2 mb-1">
          <div className="flex items-center gap-2">
            <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
            <span className="text-[10px] text-muted-foreground cursor-pointer" onClick={toggleSelectAll}>{selectedIds.size === filtered.length && filtered.length > 0 ? "إلغاء التحديد" : "تحديد الكل"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(function(p) {
              const catName = getCategoryName(p.categoryId);
              const lowStock = isLowStock(p);
              const avail = getAvailableStock(p);
              const stock = avail !== null ? avail : p.stockQuantity;
              return (
                <Card key={p.id} className={"border-0 shadow-sm hover:shadow-md transition-shadow " + (selectedIds.has(p.id) ? "ring-2 ring-emerald-500" : "")}>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={function() { toggleSelect(p.id); }} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        {p.image && (
                          <div className="w-full h-28 rounded-lg overflow-hidden bg-muted/30 mb-1">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={function(e) { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }}>
                            <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description || "بدون وصف"}</p>
                          </div>
                          <Badge dir="ltr" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shrink-0 mr-2">{p.price} π</Badge>
                        </div>
                      </div>
                    </div>
                    {/* SKU, Category, Stock */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.sku && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">{p.sku}</Badge>}
                      {catName && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/10 text-teal-600 border-teal-500/20">{catName}</Badge>}
                      {lowStock && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="h-2.5 w-2.5 ml-0.5" />مخزون منخفض</Badge>}
                    </div>
                    {/* Stock with quick adjust */}
                    {p.trackInventory && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">المتوفر:</span>
                        <button onClick={function() { handleStockAdjust(p, -1); }} className="p-0.5 rounded hover:bg-muted transition-colors border border-border/50" aria-label="تقليل"><Minus className="h-2.5 w-2.5" /></button>
                        <span className={"text-xs font-medium min-w-[20px] text-center " + (stock <= 0 ? "text-red-600" : lowStock ? "text-amber-600" : "text-emerald-600")}>{stock}</span>
                        <button onClick={function() { handleStockAdjust(p, 1); }} className="p-0.5 rounded hover:bg-muted transition-colors border border-border/50" aria-label="زيادة"><Plus className="h-2.5 w-2.5" /></button>
                        {getReservedStock(p) > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">محجوز: {getReservedStock(p)}</Badge>}
                      </div>
                    )}
                    {p.costPrice > 0 && (
                      <div className="text-[10px] text-muted-foreground">التكلفة: {formatPi(p.costPrice)} π · الربح: {formatPi(p.price - p.costPrice)} π</div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <button onClick={function() { handleToggle(p); }} className={"text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer" + (p.isActive ? " border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : " border-zinc-500/30 text-zinc-500 bg-zinc-500/10")}>
                        {p.isActive ? "نشط" : "معطّل"}
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={function() { setEditForm(Object.assign({}, p)); setEditOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="تعديل المنتج"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={function() { setDeleteTarget(p); }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" aria-label="حذف المنتج"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border border-border shadow-lg rounded-full px-4 py-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-medium text-muted-foreground ml-1">{selectedIds.size} محدد</span>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" disabled={batchLoading} onClick={function() { handleBatchActivate(true); }}><Power className="h-3 w-3 ml-1" />تفعيل المحدد</Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30" disabled={batchLoading} onClick={function() { handleBatchActivate(false); }}><PowerOff className="h-3 w-3 ml-1" />تعطيل المحدد</Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" disabled={batchLoading} onClick={function() { setBatchDeleteOpen(true); }}><Trash2 className="h-3 w-3 ml-1" />حذف المحدد</Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button size="sm" variant="ghost" className="text-xs h-7 p-0 w-7" onClick={function() { setSelectedIds(new Set()); }}><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={function(open) { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتج</AlertDialogTitle><AlertDialogDescription className="text-xs">{deleteTarget ? "هل أنت متأكد من حذف «" + deleteTarget.name + "»؟ هذا الإجراء لا يمكن التراجع عنه." : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { if (deleteTarget) { handleDelete(deleteTarget.id); setDeleteTarget(null); } }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتجات المحددة</AlertDialogTitle><AlertDialogDescription className="text-xs">هل أنت متأكد من حذف {selectedIds.size} منتج؟ هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs" disabled={batchLoading}>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleBatchDelete} disabled={batchLoading} className="text-xs bg-red-600 hover:bg-red-700">{batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : null}حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-sm">تعديل المنتج</DialogTitle><DialogDescription className="text-xs">عدّل بيانات المنتج</DialogDescription></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={editForm.name} onChange={function(e) { setEditForm(Object.assign({}, editForm, { name: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={editForm.description} onChange={function(e) { setEditForm(Object.assign({}, editForm, { description: e.target.value })); }} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">سعر البيع (Pi)</Label><Input type="number" step="0.01" value={editForm.price} onChange={function(e) { setEditForm(Object.assign({}, editForm, { price: parseFloat(e.target.value) || 0 })); }} className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">سعر التكلفة (Pi)</Label><Input type="number" step="0.01" value={editForm.costPrice} onChange={function(e) { setEditForm(Object.assign({}, editForm, { costPrice: parseFloat(e.target.value) || 0 })); }} className="text-sm" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={editForm.sku} onChange={function(e) { setEditForm(Object.assign({}, editForm, { sku: e.target.value })); }} className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">الوحدة</Label>
                  <Select value={editForm.unit || "unit"} onValueChange={function(v) { setEditForm(Object.assign({}, editForm, { unit: v })); }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit" className="text-xs">وحدة</SelectItem>
                      <SelectItem value="kg" className="text-xs">كيلوغرام</SelectItem>
                      <SelectItem value="liter" className="text-xs">لتر</SelectItem>
                      <SelectItem value="piece" className="text-xs">قطعة</SelectItem>
                      <SelectItem value="box" className="text-xs">صندوق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">التصنيف</Label>
                <Select value={editForm.categoryId || "none"} onValueChange={function(v) { setEditForm(Object.assign({}, editForm, { categoryId: v === "none" ? null : v })); }}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="بدون تصنيف" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">بدون تصنيف</SelectItem>
                    {categories.map(function(c) { return <SelectItem key={c.id} value={c.id} className="text-xs">{c.nameAr}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">رابط الصورة</Label><Input value={editForm.image} onChange={function(e) { setEditForm(Object.assign({}, editForm, { image: e.target.value })); }} className="text-sm" dir="ltr" /></div>
              <div className="flex items-center justify-between"><Label className="text-xs">حالة النشر</Label><Switch checked={editForm.isActive} onCheckedChange={function(v) { setEditForm(Object.assign({}, editForm, { isActive: v })); }} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEdit} disabled={!editForm || !editForm.name.trim() || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
