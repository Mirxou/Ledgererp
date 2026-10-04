"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Search, Loader2, Pencil, Trash2, Phone, Mail, MapPin, CircleDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import type { CustomerData } from "@/lib/types";

/* ═══ Customers ═══ */
export function CustomersView({ storeId, piUid }: { storeId: string; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerData | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "", piUid: "" });
  const [editForm, setEditForm] = useState<CustomerData | null>(null);

  const custRes = useQuery({
    queryKey: ["customers", storeId],
    queryFn: function() { return api.get("/api/customers?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const customers = ((custRes.data as Record<string, unknown>)?.data || []) as CustomerData[];

  const debouncedSearch = useDebounce(search, 250);
  const filtered = customers.filter(function(c) {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return c.name.toLowerCase().indexOf(q) !== -1 || c.phone.toLowerCase().indexOf(q) !== -1 || c.email.toLowerCase().indexOf(q) !== -1;
  }).sort(function(a, b) {
    if (sortBy === "spent") return b.totalSpent - a.totalSpent;
    if (sortBy === "orders") return b.totalOrders - a.totalOrders;
    return a.name.localeCompare(b.name, "ar");
  });

  const handleAdd = function() {
    if (!form.name.trim()) return;
    setSaving(true);
    api.post("/api/customers", { storeId: storeId, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim(), piUid: form.piUid.trim() || null }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["customers", storeId] }); setOpen(false); setForm({ name: "", phone: "", email: "", address: "", notes: "", piUid: "" }); toast({ title: "تم إضافة الزبون" }); }
      else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل الإضافة", description: err.error || "", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleEdit = function() {
    if (!editForm || !editForm.name.trim()) return;
    setSaving(true);
    api.patch("/api/customers", { id: editForm.id, name: editForm.name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim(), address: editForm.address.trim(), notes: editForm.notes.trim(), piUid: editForm.piUid || null }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["customers", storeId] }); setEditOpen(false); setEditForm(null); toast({ title: "تم تحديث الزبون" }); }
      else { toast({ title: "فشل التحديث", variant: "destructive" }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleDelete = function(id: string) {
    api.delete("/api/customers", { id: id }, piUid).then(function(res) {
      if (res.ok) { qc.invalidateQueries({ queryKey: ["customers", storeId] }); toast({ title: "تم حذف الزبون" }); }
      else toast({ title: "فشل الحذف", variant: "destructive" });
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-base">الزبائن</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />إضافة زبون</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-sm">زبون جديد</DialogTitle><DialogDescription className="text-xs">أضف زبوناً لدليل عملائك</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم *</Label><Input value={form.name} onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }} placeholder="اسم الزبون" className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">الهاتف</Label><Input value={form.phone} onChange={function(e) { setForm(Object.assign({}, form, { phone: e.target.value })); }} placeholder="05xxxxxxxx" className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">البريد</Label><Input value={form.email} onChange={function(e) { setForm(Object.assign({}, form, { email: e.target.value })); }} placeholder="email@..." className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">العنوان</Label><Input value={form.address} onChange={function(e) { setForm(Object.assign({}, form, { address: e.target.value })); }} placeholder="العنوان..." className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pi UID (اختياري)</Label><Input value={form.piUid} onChange={function(e) { setForm(Object.assign({}, form, { piUid: e.target.value })); }} placeholder="معرف Pi" className="text-sm" dir="ltr" /></div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={form.notes} onChange={function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }} placeholder="ملاحظات..." className="text-sm min-h-[56px]" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd} disabled={!form.name.trim() || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}إضافة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث بالاسم، الهاتف، البريد..." className="text-sm pr-9" /></div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name" className="text-xs">الاسم</SelectItem>
            <SelectItem value="spent" className="text-xs">الأعلى إنفاقاً</SelectItem>
            <SelectItem value="orders" className="text-xs">الأعلى طلبات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{search ? "لا توجد نتائج" : "لا يوجد زبائن بعد"}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">أضف أول زبون</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(function(c) {
            return (
              <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                        {c.piUid && <Badge className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/15 text-teal-600 border-teal-500/20 border">π Pi</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={function() { setEditForm(Object.assign({}, c)); setEditOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                      <button onClick={function() { setDeleteTarget(c); }} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3 w-3 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /><span dir="ltr">{c.phone}</span></div>}
                    {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span dir="ltr" className="truncate">{c.email}</span></div>}
                    {c.address && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{c.address}</span></div>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="text-[10px]">
                      <span className="text-muted-foreground">إنفاق: </span>
                      <span className="font-bold text-emerald-600">{formatPi(c.totalSpent)} π</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-muted-foreground">طلبات: </span>
                      <span className="font-bold">{c.totalOrders}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={function(o) { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">حذف الزبون</AlertDialogTitle><AlertDialogDescription className="text-xs">{deleteTarget ? "هل أنت متأكد من حذف «" + deleteTarget.name + "»؟" : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={function() { if (deleteTarget) { handleDelete(deleteTarget.id); setDeleteTarget(null); } }} className="text-xs bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">تعديل الزبون</DialogTitle><DialogDescription className="text-xs">عدّل بيانات الزبون</DialogDescription></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">الاسم</Label><Input value={editForm.name} onChange={function(e) { setEditForm(Object.assign({}, editForm, { name: e.target.value })); }} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">الهاتف</Label><Input value={editForm.phone} onChange={function(e) { setEditForm(Object.assign({}, editForm, { phone: e.target.value })); }} className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">البريد</Label><Input value={editForm.email} onChange={function(e) { setEditForm(Object.assign({}, editForm, { email: e.target.value })); }} className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">العنوان</Label><Input value={editForm.address} onChange={function(e) { setEditForm(Object.assign({}, editForm, { address: e.target.value })); }} className="text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pi UID</Label><Input value={editForm.piUid || ""} onChange={function(e) { setEditForm(Object.assign({}, editForm, { piUid: e.target.value || null })); }} className="text-sm" dir="ltr" /></div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={editForm.notes} onChange={function(e) { setEditForm(Object.assign({}, editForm, { notes: e.target.value })); }} className="text-sm min-h-[56px]" /></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleEdit} disabled={!editForm || !editForm.name.trim() || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
