"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Minus, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { submitCustomerOrder } from "@/app/actions";

type Item = { id: string; name: string; category: string; price: number; stock: number };

type Props = {
  deviceId: string;
  initial: {
    cafeName: string;
    deviceNumber: string;
    hasActiveSession: boolean;
    items: Item[];
  };
};

export default function MenuClient({ deviceId, initial }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(initial.items.map((i) => i.category).filter(Boolean)));
    return ["All", ...cats];
  }, [initial.items]);

  const [cat, setCat] = useState("All");

  const filtered = useMemo(
    () => initial.items.filter((i) => cat === "All" || i.category === cat),
    [initial.items, cat]
  );

  const total = useMemo(() => {
    return initial.items.reduce((sum, i) => sum + i.price * (cart[i.id] || 0), 0);
  }, [cart, initial.items]);

  const setQty = (id: string, q: number, max: number) => {
    const next = Math.max(0, Math.min(max, q));
    setCart((prev) => {
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!initial.hasActiveSession) {
      toast.error("لا توجد جلسة نشطة على هذا الجهاز. اطلب من الكاشير تشغيل الجهاز أولاً.");
      return;
    }
    const lines = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    if (!lines.length) {
      toast.error("اختر صنفاً واحداً على الأقل.");
      return;
    }
    setPending(true);
    try {
      const r = await submitCustomerOrder(deviceId, lines);
      if (!r.success) {
        toast.error(r.message);
        return;
      }
      toast.success("تم إرسال الطلب إلى الكاشير.");
      setCart({});
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-lg mx-auto" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-400 mb-3">
          <Coffee className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">{initial.cafeName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          جهاز رقم <span className="font-mono font-bold text-foreground">#{initial.deviceNumber}</span>
        </p>
        {!initial.hasActiveSession && (
          <p className="mt-3 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            انتظر حتى يبدأ الكاشير الجلسة على هذا الجهاز لتفعيل الطلب.
          </p>
        )}
      </motion.header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${
              cat === c
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            {c === "All" ? "الكل" : c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((item, idx) => {
          const q = cart[item.id] || 0;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => setQty(item.id, q + 1, item.stock)}
              className="glass-card rounded-2xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors active:scale-[0.98]"
            >
              <div className="flex-1 min-w-0 text-right pointer-events-none">
                <p className="font-bold text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.price.toFixed(2)} ج
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={q <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQty(item.id, q - 1, item.stock);
                  }}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center disabled:opacity-30 hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono font-bold pointer-events-none">{q}</span>
                <button
                  type="button"
                  disabled={q >= item.stock}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQty(item.id, q + 1, item.stock);
                  }}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center disabled:opacity-30 hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1 text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">الإجمالي</p>
            <p className="text-xl font-black font-mono text-foreground">{total.toFixed(2)} ج</p>
          </div>
          <button
            type="button"
            disabled={pending || total <= 0}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg disabled:opacity-40"
          >
            {pending ? (
              <span>...</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                إرسال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
