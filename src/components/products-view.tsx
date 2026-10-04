"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Package, Search, Loader2, Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import type { ProductData, CategoryData } from "@/lib/types";

/* ═══ Products ═══ */
export function ProductsView({ products, storeId, piUid, categories }: { products: ProductData[]; storeId: string; piUid: string; categories: CategoryData[] }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", costPrice: "", image: "", sku: "", categoryId: "none", unit: "unit" });
  const [editForm, setEditForm] = useState<ProductData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ProductData | null>(null);

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

  const debouncedSearch = useDebounce(search, 250);
  const filtered = products.filter(function(p) {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (debouncedSearch) return p.name.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1 || (p.sku && p.sku.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1);
    return true;
  });

  const getCategoryName = function(categoryId: string | null) {
    if (!categoryId) return null;
    const cat = categories.find(function(c) { return c.id === categoryId; });
    return cat ? cat.nameAr : null;
  };

  const isLowStock = function(p: ProductData) {
    return p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث عن منتج أو SKU..." className="text-sm pr-9" /></div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 text-xs shrink-0"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">الكل</SelectItem>
            {categories.map(function(c) { return <SelectItem key={c.id} value={c.id} className="text-xs">{c.nameAr}</SelectItem>; })}
          </SelectContent>
        </Select>
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
        search ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد نتائج</p>
            <p className="text-xs text-muted-foreground/70 mt-1">جرب بحثاً آخر</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد منتجات بعد</p>
            <p className="text-xs text-muted-foreground/70 mt-1">أضف أول منتج لمتجرك</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(function(p) {
            const catName = getCategoryName(p.categoryId);
            const lowStock = isLowStock(p);
            return (
              <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2.5">
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
                  {/* SKU, Category, Stock */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.sku && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">{p.sku}</Badge>}
                    {catName && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/10 text-teal-600 border-teal-500/20">{catName}</Badge>}
                    {lowStock && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="h-2.5 w-2.5 ml-0.5" />مخزون منخفض</Badge>}
                    {p.trackInventory && <span className="text-[10px] text-muted-foreground">المخزون: {p.stockQuantity}</span>}
                  </div>
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
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={function(open) { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف المنتج</AlertDialogTitle><AlertDialogDescription className="text-xs">{deleteTarget ? "هل أنت متأكد من حذف «" + deleteTarget.name + "»؟ هذا الإجراء لا يمكن التراجع عنه." : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { if (deleteTarget) { handleDelete(deleteTarget.id); setDeleteTarget(null); } }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
