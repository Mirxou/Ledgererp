"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, Shield, Globe, ChevronDown, Star, Users, Wallet, ShoppingCart,
  FileText, Lock, AlertTriangle, CheckCircle2, CreditCard, Truck,
  Scale, BarChart3, Target, Zap, Heart, Lightbulb, ShieldCheck,
  ArrowLeftRight, FileCheck, Receipt, CircleDot, ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function StudyContent() {
  return (
    <div dir="rtl" className="bg-white">
      {/* HERO */}
      <header className="relative overflow-hidden bg-gradient-to-bl from-purple-900 via-purple-800 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-purple-400 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-indigo-400 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6">
            <Star className="w-4 h-4 text-yellow-300" />
            <span>دراسة بحثية معمقة — 2025</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black leading-tight mb-4">
            دراسة معمقة: إكوسيستم شبكة بي
            <br />
            <span className="text-purple-200">والرؤية المستقبلية للتجارة الإلكترونية</span>
          </h1>
          <p className="text-base md:text-lg text-purple-200 max-w-2xl mx-auto mb-6">
            من منظور الدكتور نيكولاس كوكاليس — المؤسس والمدير التقني لشبكة Pi
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <Badge className="bg-white/20 text-white border-0 px-3 py-1">60+ مليون مستخدم</Badge>
            <Badge className="bg-white/20 text-white border-0 px-3 py-1">230+ دولة</Badge>
            <Badge className="bg-white/20 text-white border-0 px-3 py-1">Open Network — فبراير 2025</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        {/* المقدمة */}
        <StudySection id="s-intro" title="المقدمة" icon={BookOpen}>
          <p>أنا الدكتور نيكولاس كوكاليس، حاصل على درجة الدكتوراه في الأنظمة الموزعة من جامعة ستانفورد. في عام 2018، أسّست مع شينغدياو فان شبكة Pi برؤية واضحة: بناء أكثر منظومة نظير لنظير شمولية في العالم، مدعومة بأكثر عملة مشفرة انتشاراً على نطاق واسع.</p>
          <p>اليوم، تضم شبكة Pi أكثر من 60 مليون عضو في أكثر من 230 دولة. في 20 فبراير 2025، أطلقنا Open Network وفتحنا جدار الميننت. وصلت Pi إلى أعلى سعر تاريخي بلغ 2.99 دولار. هذه الدراسة تأتي في لحظة محورية — الإكوسيستم بحاجة ماسة إلى بنية تحتية تجارية حقيقية.</p>
          <CalloutBox type="info" title="ملاحظة من المؤسس">
            <p>&quot;رؤيتنا لم تكن يوماً بناء عملة للمضاربة. رؤيتنا هي بناء نظام بيئي حقيقي حيث يمكن لأي إنسان المشاركة في الاقتصاد الرقمي العالمي.&quot;</p>
          </CalloutBox>
        </StudySection>
        <Separator className="my-8" />

        {/* الفصل الأول */}
        <StudySection id="s-ch1" title="الفصل الأول: الإكوسيستم الشامل لشبكة Pi" icon={Globe}>
          <p>إكوسيستم Pi ليس مجرد مجموعة تطبيقات عشوائية — بل منظومة متماسكة مصممة لتوفير فائدة حقيقية. الفلسفة الأساسية: العملة الرقمية يجب أن تُستخدم فعلياً في حياة الناس اليومية.</p>
          <SubSectionStudy title="البنية التحتية التقنية">
            <p><strong>متصفح Pi:</strong> البوابة الوحيدة لجميع التطبيقات. يعمل ضمن domain واحد لضمان الأمان والتجربة السلسة.</p>
            <p><strong>Pi SDK:</strong> مجموعة أدوات التطوير للمصادقة والمدفوعات (U2A و A2U) والوصول لميزات Pi. المكتبة الجديدة تتيح دمج الدفع في أقل من 10 دقائق.</p>
            <p><strong>محفظة Pi:</strong> مع حماية 2FA إلزامية. <strong>PiNet:</strong> نظام المراسلة المدمج. <strong>Payment API:</strong> U2A للمدفوعات و A2U للمكافآت.</p>
          </SubSectionStudy>
          <SubSectionStudy title="تصنيفات التطبيقات">
            <p>التجارة والأسواق (PiPay, PI Bren)، المدفوعات والتمويل، الشبكات الاجتماعية (SocialChain)، الألعاب (CiDi Games)، الذكاء الاصطناعي (Pi App Studio)، والأدوات المساندة — وهذا ما يمثل تطبيق الفواتير والضمان.</p>
          </SubSectionStudy>
          <SubSectionStudy title="نظام Staking">
            <p>أُطلق في Pi2Day 2025. يتيح للمستخدمين رهن Pi لتعزيز تصنيف التطبيقات في الدليل. آلية لامركزية حيث يقرر المجتمع أي التطبيقات تتصدر.</p>
          </SubSectionStudy>
        </StudySection>
        <Separator className="my-8" />

        {/* الفصل الثاني */}
        <StudySection id="s-ch2" title="الفصل الثاني: أهمية تطبيقات الفواتير والحماية" icon={Shield}>
          <p>هذا الفصل جوهر الدراسة. يحتاج الإكوسيستم بشكل عاجل إلى تطبيق إنشاء فواتير وآلية ضمان (Escrow).</p>
          <SubSectionStudy title="الفجوة في الإكوسيستم">
            <p>لا يوجد نظام فواتير مهني، لا توجد آلية ضمان (Escrow)، ولا يوجد تتبع للطلبات. غياب هذه العناصر يحد من حجم المعاملات ويمنع التجارة الحقيقية.</p>
          </SubSectionStudy>
          <SubSectionStudy title="لماذا هو حاسم؟">
            <p><strong>نظام الفواتير:</strong> فواتير منظمة للمحاسبة والضرائب. <strong>آلية الضمان:</strong> حجز Pi حتى يصل المنتج. <strong>تتبع الطلبات:</strong> دورة حياة واضحة من الإنشاء للإكمال. <strong>لوحة التحكم:</strong> إدارة المنتجات والطلبات والإيرادات.</p>
          </SubSectionStudy>
          <SubSectionStudy title="التأثير المتوقع">
            <p>سيتيح معاملات أكبر حجماً، سيجذب تجاراً محترفين، سينشئ سلاسل توريد حقيقية، وسيعزز ثقة المستخدمين في Pi كعملة تجارية.</p>
          </SubSectionStudy>
        </StudySection>
        <Separator className="my-8" />

        {/* الفصل الثالث */}
        <StudySection id="s-ch3" title="الفصل الثالث: التوافق مع المبادئ الرسمية" icon={ShieldCheck}>
          <p>أي تطبيق يجب أن يتوافق تماماً مع المبادئ التوجيهية الرسمية. عدم الالتزام يعني عدم القبول في قائمة الميننت.</p>
          <SubSectionStudy title="متطلبات القائمة في الميننت">
            <p>1) تطبيق كامل الوظائف بواجهة احترافية. 2) إكمال KYC للمطور. 3) تجنب انتهاك العلامات التجارية. 4) مصادقة Pi فقط (لا Google/Facebook). 5) معاملات Pi فقط. 6) عدم إعادة التوجيه خارجياً. 7) حد أدنى من جمع البيانات.</p>
          </SubSectionStudy>
          <SubSectionStudy title="تحذيرات الفريق الرسمي">
            <CalloutBox type="warning" title="Safety Notice 02-21-2025">
              <p>البقاء يقظين تجاه الاحتيال. استخدام محفظة Pi الأصلية فقط. شخص واحد = حساب واحد. Pi لا تضمن القيمة. لا ترسلوا Pi لعناوين غير معروفة.</p>
            </CalloutBox>
          </SubSectionStudy>
        </StudySection>
        <Separator className="my-8" />

        {/* الفصل الرابع */}
        <StudySection id="s-ch4" title="الفصل الرابع: الربط مع تطبيقات الميننت" icon={ArrowLeftRight}>
          <p>في 20 فبراير 2025، أُتيح لتطبيقات Mainnet التعامل بـ Pi الحقيقية. آليات التكامل تشمل: مصادقة Pi المشتركة، Payment API، و PiNet للتواصل.</p>
          <SubSectionStudy title="نموذج التكامل">
            <p>تطبيق سوق يُنشئ فاتورة تلقائياً في تطبيقنا. تطبيق خدمات يستخدم الضمان. تاجر جملة يبيع لتاجر تجزئة عبر الفواتير. هذا يُنشئ سلسلة تجارية حقيقية بعملة Pi.</p>
          </SubSectionStudy>
          <SubSectionStudy title="بروتوكول v25 والذكاء الاصطناعي">
            <p>أطلقنا Subscription Smart Contracts على Testnet ومبادرة AI في Pi2Day 2025. في Consensus 2025، تحدثت عن &quot;AI + Blockchain Infra to Unleash Mainstream Adoption&quot;.</p>
          </SubSectionStudy>
        </StudySection>
        <Separator className="my-8" />

        {/* الفصل الخامس */}
        <StudySection id="s-ch5" title="الفصل الخامس: الرؤية المستقبلية والتوصيات" icon={Target}>
          <p>التجارة الإلكترونية هي المحرك الأكبر للاقتصاد الرقمي. تطبيق الفواتير والضمان هو العمود الفقري الذي سيرتقي بإكوسيستم Pi.</p>
          <SubSectionStudy title="التوصيات">
            <p>1) Pi SDK للمصادقة حصرياً. 2) Pi Payment API لجميع المعاملات. 3) العمل بالكامل داخل Pi Browser. 4) إكمال KYC للمطور. 5) شفافية كاملة في آلية الضمان. 6) واجهة احترافية. 7) حد أدنى من البيانات. 8) عدم استخدام علامات Pi التجارية.</p>
          </SubSectionStudy>
          <SubSectionStudy title="خارطة الطريق">
            <p>المرحلة 1: البناء على Testnet. المرحلة 2: تكامل Pi SDK. المرحلة 3: التقديم للميننت. المرحلة 4: التكامل مع الإكوسيستم. المرحلة 5: ميزات متقدمة (ذكاء اصطناعي، اشتراكات).</p>
          </SubSectionStudy>
        </StudySection>
        <Separator className="my-8" />

        {/* الخاتمة */}
        <StudySection id="s-conclusion" title="الخاتمة" icon={Heart}>
          <p>في 20 فبراير 2025، حققنا إطلاق Open Network. أكثر من 60 مليون شخص يمتلكون Pi يمكنهم استخدامها في معاملات حقيقية. لكن الإطلاق كان البداية.</p>
          <p>تطبيق الفواتير والضمان يتوافق مع كل مبادئنا ويُحقق رؤيتنا الأصلية. أول تطبيق يملأ هذه الفجوة سيحظى بميزة المبادر الأول.</p>
          <CalloutBox type="success" title="رسالة ختامية">
            <p>&quot;Pi لم تُبنَ لتمكّن قلة من تحقيق أرباح سريعة. كل تطبيق يحل مشكلة حقيقية هو لبنة أساسية في هذا البناء العظيم. المستقبل يُبنى الآن.&quot;</p>
          </CalloutBox>
        </StudySection>

        <div className="text-center text-xs text-gray-400 mt-8">
          <p>جميع المعلومات مستندة إلى المصادر الرسمية — minepi.com — pi-apps.github.io — 2025</p>
        </div>
      </main>
    </div>
  );
}

/* ─── Reusable Study Components ────────────────────── */
function StudySection({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8">
      <div className="flex items-center gap-3 mb-4 border-r-4 border-purple-600 pr-4">
        <div className="p-2 bg-purple-100 rounded-lg"><Icon className="w-5 h-5 text-purple-700" /></div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-3 text-gray-700 leading-[1.9] text-sm md:text-base">{children}</div>
    </section>
  );
}

function SubSectionStudy({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-3">
      <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
        <CircleDot className="w-4 h-4 text-purple-500" /> {title}
      </h3>
      <div className="space-y-2 text-gray-700 leading-[1.9] text-sm md:text-base pr-2">{children}</div>
    </div>
  );
}

function CalloutBox({ type, title, children }: { type: "warning" | "info" | "success"; title: string; children: React.ReactNode }) {
  const colors = { warning: "border-amber-400 bg-amber-50", info: "border-blue-400 bg-blue-50", success: "border-emerald-400 bg-emerald-50" };
  const icons = { warning: AlertTriangle, info: Lightbulb, success: CheckCircle2 };
  const Icon = icons[type];
  return (
    <div className={`rounded-lg border-r-4 p-4 my-3 ${colors[type]}`}>
      <div className="flex items-center gap-2 font-bold text-sm mb-2"><Icon className="w-4 h-4" /> {title}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}