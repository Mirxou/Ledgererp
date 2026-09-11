"use client";

import React, { useState, useEffect } from "react";
import {
  Store, Shield, AlertTriangle, Loader2, CheckCircle2,
  Pencil, Trash2, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/helpers";
import type { StoreData } from "@/lib/types";

/* ═══ Settings ═══ */
export function SettingsView({ store, onUpdate, onDelete, updating, deleting, piUid: _piUid }: {
  store: StoreData; onUpdate: (d: { id: string; name?: string; description?: string; avatar?: string }) => void;
  onDelete: () => void; updating: boolean; deleting: boolean; piUid: string;
}) {
  const [name, setName] = useState(store.name);
  const [desc, setDesc] = useState(store.description);
  const [saved, setSaved] = useState(false);

  // Sync local state when store data changes from server
  useEffect(function() {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(store.name);
    setDesc(store.description);
  }, [store.name, store.description]);

  const handleSave = function() {
    onUpdate({ id: store.id, name: name.trim(), description: desc.trim() });
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  };

  const toast = useToast().toast;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="font-bold text-base">الإعدادات</h2>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Store className="h-3.5 w-3.5 text-emerald-500" />معلومات المتجر</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={name} onChange={function(e) { setName(e.target.value); setSaved(false); }} className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">الوصف</Label><Textarea value={desc} onChange={function(e) { setDesc(e.target.value); setSaved(false); }} className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">معرّف Pi (UID)</Label>
            <div className="flex items-center gap-2">
              <Input value={store.piUid} readOnly className="text-xs font-mono bg-muted/50" dir="ltr" />
              <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={function() { copyText(store.piUid, toast, "تم نسخ المعرف"); }}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updating || saved} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" /> : <Pencil className="h-3.5 w-3.5 ml-1.5" />}
            {saved ? "تم الحفظ" : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-500" />حول التطبيق</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>الإصدار</span><span className="font-mono text-foreground">2.0.0</span></div>
          <div className="flex justify-between"><span>الشبكة</span><Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Pi Mainnet</Badge></div>
          <div className="flex justify-between"><span>المنتجات النشطة</span><span className="text-foreground">{store._count ? store._count.products : "—"}</span></div>
          <div className="flex justify-between"><span>إجمالي الفواتير</span><span className="text-foreground">{store._count ? store._count.invoices : "—"}</span></div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm border-t-2 border-t-red-500/20">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold text-red-500 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3" />منطقة الخطر</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3">حذف المتجر سيحذف جميع المنتجات والفواتير. لا يمكن التراجع.</p>
          <AlertDialog><AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={deleting} className="text-xs border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Trash2 className="h-3.5 w-3.5 ml-1.5" />}حذف المتجر
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">هل أنت متأكد تماماً؟</AlertDialogTitle><AlertDialogDescription className="text-xs">سيتم حذف &quot;{store.name}&quot; وجميع بياناته نهائياً.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="text-xs bg-red-600 hover:bg-red-700">نعم، احذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
