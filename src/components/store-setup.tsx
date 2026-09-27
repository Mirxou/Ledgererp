"use client";

import React, { useState } from "react";
import {
  Store, Plus, Loader2, Link2, ArrowRight, Package,
  CheckCircle2, Globe, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ═══ Store Setup — Two Paths ═══ */
export function StoreSetup({ onCreate, onConnect, loading, username }: {
  onCreate: (name: string, desc: string, avatar: string) => void;
  onConnect: (data: ConnectStoreData) => void;
  loading: boolean;
  username?: string;
}) {
  const [mode, setMode] = useState<"choose" | "create" | "connect">("choose");

  if (mode === "create") {
    return <CreateStoreForm onBack={() => setMode("choose")} onCreate={onCreate} loading={loading} />;
  }

  if (mode === "connect") {
    return <ConnectStoreForm onBack={() => setMode("choose")} onConnect={onConnect} loading={loading} username={username} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-lg">مرحباً بك في Ledgererp</CardTitle>
          <CardDescription className="text-xs">اختر كيف تريد البدء — إنشاء متجر جديد أو ربط متجرك الحالي على Pi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Option 1: Create New Store */}
          <button
            onClick={() => setMode("create")}
            className="w-full text-right p-4 rounded-xl border-2 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <Plus className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">إنشاء متجر جديد</p>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">جديد</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  ابدأ من الصفر — أضف منتجاتك وشارك رابط متجرك مع المشترين
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
            </div>
          </button>

          {/* Option 2: Connect Existing Pi Store */}
          <button
            onClick={() => setMode("connect")}
            className="w-full text-right p-4 rounded-xl border-2 border-teal-500/20 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-colors">
                <Link2 className="h-5 w-5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">ربط متجر Pi موجود</p>
                  <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-600 border-teal-500/20">ربط فوري</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  متجرك منشور على Pi Browser؟ اربطه فوراً مع نظام الضمان واستورد منتجاتك
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-teal-500 transition-colors shrink-0 mt-1" />
            </div>
          </button>

          {/* Info notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/10">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
              في كلتا الحالتين، متجرك سيحصل على نظام ضمان كامل: الدفع بالـ Pi → ضمان → شحن → تسليم → إطلاق الأموال
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══ Create New Store Form ═══ */
function CreateStoreForm({ onBack, onCreate, loading }: { onBack: () => void; onCreate: (name: string, desc: string, avatar: string) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [avatar, setAvatar] = useState("");

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <button onClick={onBack} className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors">← رجوع</button>
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
            <Plus className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-base">إنشاء متجر جديد</CardTitle>
          <CardDescription className="text-xs">أنشئ متجرك على Ledgererp وابدء ببيع منتجاتك مع ضمان Pi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المتجر</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: متجر الإلكترونيات" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">وصف المتجر</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[72px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">رابط الصورة (اختياري)</Label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." className="text-sm" dir="ltr" />
          </div>
          <Button onClick={() => { if (name.trim()) onCreate(name.trim(), desc.trim(), avatar.trim()); }} disabled={!name.trim() || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            إنشاء المتجر
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══ Connect Existing Pi Store Form ═══ */
export interface ConnectStoreData {
  name: string;
  description: string;
  avatar: string;
  piAppUrl: string;
  products: { name: string; price: number; description: string }[];
}

function ConnectStoreForm({ onBack, onConnect, loading, username }: {
  onBack: () => void; onConnect: (data: ConnectStoreData) => void; loading: boolean; username?: string;
}) {
  const [name, setName] = useState(username || "");
  const [desc, setDesc] = useState("");
  const [avatar, setAvatar] = useState("");
  const [piAppUrl, setPiAppUrl] = useState("");
  const [products, setProducts] = useState<{ name: string; price: string; description: string }[]>([
    { name: "", price: "", description: "" },
  ]);
  const [step, setStep] = useState<1 | 2>(1);

  const addProductRow = () => {
    setProducts([...products, { name: "", price: "", description: "" }]);
  };

  const removeProductRow = (index: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleConnect = () => {
    if (!name.trim()) return;
    const validProducts = products
      .filter((p) => p.name.trim() && p.price && parseFloat(p.price) > 0)
      .map((p) => ({ name: p.name.trim(), price: parseFloat(p.price), description: p.description.trim() }));

    onConnect({
      name: name.trim(),
      description: desc.trim(),
      avatar: avatar.trim(),
      piAppUrl: piAppUrl.trim(),
      products: validProducts,
    });
  };

  const validProductCount = products.filter((p) => p.name.trim() && p.price && parseFloat(p.price) > 0).length;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <button onClick={onBack} className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors">← رجوع</button>
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-2">
            <Link2 className="h-6 w-6 text-teal-600" />
          </div>
          <CardTitle className="text-base">ربط متجر Pi موجود</CardTitle>
          <CardDescription className="text-xs">اربط متجرك المنشور على Pi Browser بنظام الضمان فوراً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 justify-center">
            <div className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium " + (step === 1 ? "bg-teal-500/10 text-teal-600" : "bg-emerald-500/10 text-emerald-600")}>
              {step === 2 ? <CheckCircle2 className="h-3 w-3" /> : <span>1</span>}
              <span>معلومات المتجر</span>
            </div>
            <div className="w-6 h-px bg-border" />
            <div className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium " + (step === 2 ? "bg-teal-500/10 text-teal-600" : "bg-muted text-muted-foreground")}>
              <span>2</span>
              <span>استيراد المنتجات</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              {/* Pi App URL — THE KEY FIELD */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-teal-500" />
                  رابط تطبيق Pi (المتجر الحالي)
                </Label>
                <Input
                  value={piAppUrl}
                  onChange={(e) => setPiAppUrl(e.target.value)}
                  placeholder="https://minepi.com/app/your-store أو رابط آخر"
                  className="text-sm"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground">رابط متجرك الحالي على Pi Browser — سيربط مع نظام الضمان</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">اسم المتجر</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={username || "اسم متجرك كما يظهر على Pi"} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">وصف المتجر</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف مختصر لمتجرك..." className="text-sm min-h-[60px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">رابط الصورة (اختياري)</Label>
                <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." className="text-sm" dir="ltr" />
              </div>

              <Button onClick={() => { if (name.trim()) setStep(2); }} disabled={!name.trim()} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm h-10">
                التالي — استيراد المنتجات
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </>
          ) : (
            <>
              {/* Product Import */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-teal-500" />
                    منتجاتك (استيراد سريع)
                  </Label>
                  <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                    {validProductCount} منتج صالح
                  </Badge>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {products.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground mt-2 shrink-0 w-4 text-center">{i + 1}</span>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <Input
                          value={p.name}
                          onChange={(e) => updateProduct(i, "name", e.target.value)}
                          placeholder="اسم المنتج"
                          className="text-xs h-8"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={p.price}
                            onChange={(e) => updateProduct(i, "price", e.target.value)}
                            placeholder="السعر (π)"
                            className="text-xs h-8 w-28"
                            dir="ltr"
                          />
                          <Input
                            value={p.description}
                            onChange={(e) => updateProduct(i, "description", e.target.value)}
                            placeholder="وصف (اختياري)"
                            className="text-xs h-8 flex-1"
                          />
                        </div>
                      </div>
                      {products.length > 1 && (
                        <button
                          onClick={() => removeProductRow(i)}
                          className="text-red-400 hover:text-red-500 mt-1.5 shrink-0"
                          aria-label="حذف المنتج"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={addProductRow} className="w-full text-xs h-8 border-dashed">
                  <Plus className="h-3 w-3 ml-1" />
                  إضافة منتج آخر
                </Button>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-xs h-9">
                  رجوع
                </Button>
                <Button onClick={handleConnect} disabled={!name.trim() || loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-9">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Link2 className="h-3.5 w-3.5 ml-1.5" />}
                  ربط المتجر{validProductCount > 0 ? ` + ${validProductCount} منتج` : ""}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
