"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Phone, CreditCard, Sparkles, MessageCircle, ShieldCheck, BarChart3, Gamepad2 } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const { isRTL } = useLang();

  const handleWhatsApp = (planName: string) => {
    // Replace YOUR_NUMBER with the actual WhatsApp number
    const phoneNumber = "201155261969"; 
    const message = `أهلاً، قمت بالتحويل للاشتراك [${planName}]. أرجو التفعيل.`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const features = [
    { icon: <Gamepad2 className="w-5 h-5 text-primary" />, text: isRTL ? "تحكم كامل عن بعد بالأجهزة" : "Remote Device Control" },
    { icon: <BarChart3 className="w-5 h-5 text-accent" />, text: isRTL ? "تقارير ورديات مفصلة" : "Detailed Shift Reports" },
    { icon: <ShieldCheck className="w-5 h-5 text-success" />, text: isRTL ? "إدارة المخزون والمبيعات" : "Inventory & Sales Management" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 pt-10 sm:pt-16 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors mb-8 font-medium text-sm text-muted-foreground hover:text-foreground"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? "العودة للوحة التحكم" : "Back to Dashboard"}
        </Link>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {isRTL ? "اختر الباقة المناسبة لعملك" : "Choose Your Plan"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isRTL
              ? "استثمر في إدارة أسهل لكافيهك أو مركز ألعابك مع خطط تسعير مرنة تناسب احتياجاتك."
              : "Invest in easier management for your cafe or gaming center with flexible pricing plans."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-card border border-border/50">
                  {feature.icon}
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-20">
          {/* Monthly */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden group">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-muted-foreground mb-2">{isRTL ? "شهري" : "Monthly"}</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">350</span>
                <span className="text-muted-foreground font-medium mb-1">EGP / {isRTL ? "شهر" : "month"}</span>
              </div>
            </div>
            <ul className="space-y-4 flex-1 mb-8">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "وصول كامل لجميع الميزات" : "Full access to all features"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "دعم فني" : "Technical support"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "تحديثات مستمرة" : "Continuous updates"}</span>
              </li>
            </ul>
            <button
              onClick={() => handleWhatsApp("Monthly 350 EGP")}
              className="w-full py-3.5 rounded-xl font-bold bg-card border border-border hover:bg-muted transition-colors text-sm"
            >
              {isRTL ? "اشترك الآن" : "Subscribe Now"}
            </button>
          </div>

          {/* Yearly */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden transform md:-translate-y-4 neon-border-cyan">
            <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-primary to-secondary py-1.5 text-center">
              <span className="text-[10px] uppercase tracking-widest font-black text-white">
                {isRTL ? "القيمة الأفضل" : "Best Value"}
              </span>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -z-10 rounded-full" />
            <div className="mb-8 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-primary">{isRTL ? "سنوي" : "Yearly"}</h3>
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">3200</span>
                <span className="text-muted-foreground font-medium mb-1">EGP / {isRTL ? "سنة" : "year"}</span>
              </div>
              <p className="text-xs text-success font-semibold mt-2">{isRTL ? "وفر 1000 جنيه سنوياً (3 شهور مجاناً) 🎁" : "Save 1000 EGP yearly (3 months free) 🎁"}</p>
            </div>
            <ul className="space-y-4 flex-1 mb-8">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "وصول كامل لجميع الميزات" : "Full access to all features"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "دعم فني مميز" : "Priority support"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "تحديثات مستمرة" : "Continuous updates"}</span>
              </li>
            </ul>
            <button
              onClick={() => handleWhatsApp("Yearly 3200 EGP")}
              className="w-full py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all active:scale-95 text-sm"
            >
              {isRTL ? "اشترك الآن" : "Subscribe Now"}
            </button>
          </div>

          {/* Lifetime */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden group">
            <div className="absolute right-0 top-0 m-4">
              <div className="badge badge-amber">{isRTL ? "استثمار لمرة واحدة" : "One-time investment"}</div>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-muted-foreground mb-2 mt-4 sm:mt-0">{isRTL ? "مدى الحياة" : "Lifetime"}</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">5600</span>
                <span className="text-muted-foreground font-medium mb-1">EGP</span>
              </div>
            </div>
            <ul className="space-y-4 flex-1 mb-8">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "دفع لمرة واحدة فقط" : "Pay once, use forever"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "وصول كامل لجميع الميزات" : "Full access to all features"}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{isRTL ? "تحديثات مجانية دائماً" : "Lifetime free updates"}</span>
              </li>
            </ul>
            <button
              onClick={() => handleWhatsApp("Lifetime 5600 EGP")}
              className="w-full py-3.5 rounded-xl font-bold bg-card border border-border hover:bg-muted transition-colors text-sm"
            >
              {isRTL ? "اشترك الآن" : "Subscribe Now"}
            </button>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="max-w-3xl mx-auto glass-card rounded-3xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black mb-2">{isRTL ? "طرق الدفع المتاحة" : "How to Pay"}</h2>
            <p className="text-muted-foreground text-sm">{isRTL ? "قم بالتحويل عبر إحدى الطرق التالية ثم تواصل معنا للتفعيل" : "Transfer via one of the following methods, then contact us for activation."}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="p-5 rounded-2xl bg-card border border-border flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h4 className="font-bold mb-1">InstaPay</h4>
                <p className="text-sm text-muted-foreground mb-2">{isRTL ? "حساب انستا باي" : "InstaPay Username/ID"}</p>
                <code className="px-3 py-1.5 rounded-lg bg-background text-foreground font-mono text-sm font-bold border border-border block w-fit">
                  your_instapay_id
                </code>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold mb-1">{isRTL ? "محافظ إلكترونية" : "E-Wallet"}</h4>
                <p className="text-sm text-muted-foreground mb-2">{isRTL ? "فودافون كاش / الخ" : "Vodafone Cash, etc."}</p>
                <code className="px-3 py-1.5 rounded-lg bg-background text-foreground font-mono text-sm font-bold border border-border block w-fit">
                  01000000000
                </code>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center pt-6 border-t border-border">
            <p className="text-sm font-medium mb-4">{isRTL ? "بعد إتمام التحويل، يرجى التواصل معنا للتفعيل الفوري:" : "After transferring, please contact us for instant activation:"}</p>
            <button
              onClick={() => handleWhatsApp("Plan Name")}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/25 active:scale-95"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-lg">{isRTL ? "الدفع والتفعيل عبر واتساب" : "Pay & Activate via WhatsApp"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
