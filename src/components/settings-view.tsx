"use client";

import React, { useState, useEffect } from "react";
import {
  Store, Shield, AlertTriangle, Loader2, CheckCircle2,
  Pencil, Trash2, Copy, Link, Share2, Link2, Globe,
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
  store: StoreData; onUpdate: (d: { id: string; name?: string; description?: string; avatar?: string; piAppUrl?: string }) => void;
  onDelete: () => void; updating: boolean; deleting: boolean; piUid: string;
}) {
  const [name, setName] = useState(store.name);
  const [desc, setDesc] = useState(store.description);
  const [piAppUrl, setPiAppUrl] = useState(store.piAppUrl || "");
  const [saved, setSaved] = useState(false);

  // Sync local state when store data changes from server
  useEffect(function() {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(store.name);
    setDesc(store.description);
    setPiAppUrl(store.piAppUrl || "");
  }, [store.name, store.description, store.piAppUrl]);

  const handleSave = function() {
    onUpdate({ id: store.id, name: name.trim(), description: desc.trim(), piAppUrl: piAppUrl.trim() });
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
  };

  const toast = useToast().toast;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="font-bold text-base">الإعدادات</h2>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Share2 className="h-3.5 w-3.5 text-emerald-500" />رابط المتجر للمشترين</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            شارك هذا الرابط مع المشترين ليتمكنوا من تصفح منتجاتك وطلبها مع ضمان الدفع
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-[11px] font-mono truncate border border-border/50" dir="ltr">
              {typeof window !== "undefined" ? window.location.origin + "?store=" + store.id : ""}
            </div>
            <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1.5" onClick={function() { copyText(typeof window !== "undefined" ? window.location.origin + "?store=" + store.id : "", toast, "تم نسخ رابط المتجر"); }}>
              <Copy className="h-3 w-3" />نسخ
            </Button>
          </div>
          {store.slug && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground">رابط مختصر:</span>
              <div className="flex-1 bg-muted/30 rounded px-2 py-1 text-[10px] font-mono truncate" dir="ltr">
                {typeof window !== "undefined" ? window.location.origin + "?store=" + store.slug : ""}
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 h-6 text-[10px] gap-1 px-2" onClick={function() { copyText(typeof window !== "undefined" ? window.location.origin + "?store=" + store.slug : "", toast, "تم نسخ الرابط المختصر"); }}>
                <Copy className="h-2.5 w-2.5" />نسخ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pi Connection Info */}
      {store.source === "pi_connected" && (
        <Card className="border-0 shadow-sm border-l-4 border-l-teal-500/40">
          <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-teal-500" />ربط Pi</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/15 text-teal-600 border-teal-500/20 border">
                <Link2 className="h-2.5 w-2.5 ml-0.5" />متجر Pi مربوط
              </Badge>
              <span className="text-[10px] text-muted-foreground">تم الربط فوراً</span>
            </div>
            {store.piAppUrl && (
              <div className="space-y-1.5">
                <Label className="text-xs">رابط تطبيق Pi</Label>
                <div className="flex items-center gap-2">
                  <Input value={piAppUrl} onChange={function(e) { setPiAppUrl(e.target.value); setSaved(false); }} className="text-xs font-mono" dir="ltr" />
                  <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={function() { window.open(piAppUrl, "_blank"); }}>
                    <Globe className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="flex justify-between"><span>نوع المتجر</span><span className="text-foreground">{store.source === "pi_connected" ? "متجر Pi مربوط" : "متجر Ledgererp"}</span></div>
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
