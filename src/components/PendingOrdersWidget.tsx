"use client";

import React, { useEffect, useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { getPendingOrders, confirmPendingOrder, cancelPendingOrder } from "@/app/actions/customer-menu.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PendingOrdersWidget() {
  const { isRTL } = useLang();
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const prevCountRef = useRef<number>(0);

  const fetchOrders = async () => {
    const res = await getPendingOrders();
    if (res.success && res.orders) {
      setPendingOrders(res.orders);
      
      // Toast notification for new orders
      const currentCount = res.orders.length;
      if (currentCount > prevCountRef.current) {
         const newOrdersCount = currentCount - prevCountRef.current;
         toast.warning(isRTL ? `طلب معلق جديد` : `New Pending Order`, {
           description: isRTL ? `يوجد ${newOrdersCount} طلبات تحتاج لتأكيدك` : `${newOrdersCount} item(s) awaiting confirmation`,
           duration: 10000,
           position: isRTL ? "top-left" : "top-right",
         });
         
         try {
           const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); 
         } catch(e) {}
      }
      prevCountRef.current = currentCount;
    }
  };

  useEffect(() => {
    fetchOrders(); // Initial fetch
    let cancelled = false;
    const interval = setInterval(() => {
      if (!cancelled) fetchOrders();
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRTL]);

  if (pendingOrders.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-6 z-[9999] w-80 bg-background/95 backdrop-blur-xl border-2 border-amber-500/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-3",
        isRTL ? "left-6" : "right-6"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className={cn("flex items-center justify-between border-b border-border pb-2", isRTL && "flex-row-reverse")}>
        <h3 className={cn("font-black text-amber-500 flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          {isRTL ? "طلبات معلقة" : "Pending Orders"} ({pendingOrders.length})
        </h3>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {pendingOrders.map(o => (
          <div key={o.id} className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className={cn("flex justify-between items-start mb-2", isRTL && "flex-row-reverse text-right")}>
              <div className="w-full">
                <p className="font-bold text-foreground text-sm">{o.inventoryItem?.name} <span className="text-amber-500 font-black">x{o.quantity}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL ? "جهاز رقم" : "Device"} <span className="font-bold text-foreground">#{o.deviceNumber}</span>
                </p>
              </div>
            </div>
            <div className={cn("flex gap-2 mt-3", isRTL && "flex-row-reverse")}>
              <button
                onClick={async () => {
                  const res = await confirmPendingOrder(o.id);
                  if(res.success) {
                    toast.success(isRTL ? "تم التأكيد وإضافته للفاتورة" : "Confirmed & Added to bill");
                    fetchOrders();
                    router.refresh();
                  } else {
                    toast.error(res.message);
                  }
                }}
                className="flex-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                {isRTL ? "تأكيد وتقديم" : "Confirm"}
              </button>
              <button
                onClick={async () => {
                  const res = await cancelPendingOrder(o.id);
                  if(res.success) {
                    fetchOrders();
                    router.refresh();
                  } else {
                    toast.error(res.message);
                  }
                }}
                className="flex-1 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-500/20 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                {isRTL ? "إلغاء/رفض" : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
