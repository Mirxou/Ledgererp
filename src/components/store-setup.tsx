"use client";

import React, { useState } from "react";
import { Store, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/* ═══ Store Setup ═══ */
export function StoreSetup({ onCreate, loading }: { onCreate: (name: string, desc: string, avatar: string) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [avatar, setAvatar] = useState("");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-lg">مرحباً بك في Ledgererp</CardTitle>
          <CardDescription className="text-xs">أنشئ متجرك لبدء إصدار الفواتير واستقبال المدفوعات بالـ Pi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs">اسم المتجر</Label><Input value={name} onChange={function(e) { setName(e.target.value); }} placeholder="مثال: متجر الإلكترونيات" className="text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs">وصف المتجر</Label><Textarea value={desc} onChange={function(e) { setDesc(e.target.value); }} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[72px]" /></div>
          <div className="space-y-1.5"><Label className="text-xs">رابط الصورة (اختياري)</Label><Input value={avatar} onChange={function(e) { setAvatar(e.target.value); }} placeholder="https://..." className="text-sm" dir="ltr" /></div>
          <Button onClick={function() { if (name.trim()) onCreate(name.trim(), desc.trim(), avatar.trim()); }} disabled={!name.trim() || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            إنشاء المتجر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
