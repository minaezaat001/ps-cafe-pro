"use client";

import dynamic from "next/dynamic";
import { LayoutGrid, List, AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { getDevicesSnapshotForDashboard } from "@/app/actions";
import type { DashboardDeviceSnapshot } from "@/lib/dashboard-serialize";
import Link from "next/link";

function cn(...inputs: (string | boolean | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

// ── Lazy-load the heavy DeviceCard (76KB) — renders after shell is visible ──
const DeviceCard = dynamic(
  () => import("@/components/DeviceCard").then((m) => ({ default: m.DeviceCard })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border bg-card/50 animate-pulse h-[200px]" />
    ),
  }
);

export default function DashboardClient({
  initialDevices,
  initialRevision,
  deviceTypes,
  activeShift,
  appBaseUrl,
  showDeviceQr,
}: {
  initialDevices: DashboardDeviceSnapshot[];
  initialRevision: string;
  deviceTypes?: unknown[];
  activeShift?: unknown;
  appBaseUrl: string;
  showDeviceQr?: boolean;
}) {
  const { t, isRTL } = useLang();
  const [isCompact, setIsCompact] = useState(false);
  const [devices, setDevices] = useState<DashboardDeviceSnapshot[]>(initialDevices);
  const revRef = useRef<string>(initialRevision);
  const prevOrdersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem("pscafe_isCompact");
    if (saved) setIsCompact(saved === "true");
  }, []);

  // Initialize previous orders count
  useEffect(() => {
    const counts: Record<string, number> = {};
    initialDevices.forEach(d => {
      if (d.sessions && d.sessions[0]) {
        counts[d.id] = d.sessions[0].orders.length;
      }
    });
    prevOrdersRef.current = counts;
    setDevices(initialDevices);
    revRef.current = initialRevision;
  }, [initialDevices, initialRevision]);

  const refreshFromServer = useCallback(async () => {
    const r = await getDevicesSnapshotForDashboard();
    if (r.success) {
      revRef.current = r.revision;
      setDevices(r.devices);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      const r = await getDevicesSnapshotForDashboard();
      if (cancelled || !r.success) return;
      if (r.revision === revRef.current) return;
      
      // Detect new orders for notifications
      r.devices.forEach((d) => {
        const session = d.sessions[0];
        if (session) {
          const pendingOrders = session.orders.filter(o => o.status === "PENDING");
          const prevCount = prevOrdersRef.current[d.id] || 0;
          if (pendingOrders.length > prevCount) {
             const newOrdersCount = pendingOrders.length - prevCount;
             import("sonner").then(({ toast }) => {
               toast.warning(isRTL ? `طلب معلق من جهاز ${d.number}` : `Pending Order from Device ${d.number}`, {
                 description: isRTL ? `يوجد ${newOrdersCount} طلبات تحتاج لتأكيدك` : `${newOrdersCount} item(s) awaiting confirmation`,
                 duration: 10000,
                 position: isRTL ? "top-left" : "top-right",
               });
               
               // Try to play a default system beep or notification sound
               try {
                 const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); 
                 // For now, we just rely on visual toast. User can add notification.mp3 later.
               } catch(e) {}
             });
          }
          prevOrdersRef.current[d.id] = pendingOrders.length;
        } else {
          prevOrdersRef.current[d.id] = 0;
        }
      });

      revRef.current = r.revision;
      setDevices(r.devices);
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isRTL]);

  const toggleCompact = () => {
    const newVal = !isCompact;
    setIsCompact(newVal);
    localStorage.setItem("pscafe_isCompact", newVal.toString());
  };

  return (
    <div className="space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      {!activeShift && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <h3 className="text-red-400 font-bold">
                {isRTL ? "لا توجد وردية مفتوحة!" : "No Active Shift!"}
              </h3>
              <p className="text-xs text-red-400/80 mt-0.5">
                {isRTL
                  ? "أنت بحاجة لفتح وردية الكاشير الآن لتتمكن من بدء الجلسات وطلبات الكافيتريا."
                  : "You must log a shift to start device sessions and process operations."}
              </p>
            </div>
          </div>
          <Link
            href="/shift"
            className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors whitespace-nowrap text-sm h-fit"
          >
            {isRTL ? "فتح وردية جديدة" : "Open Current Shift"}
          </Link>
        </div>
      )}

      <section>
        <div
          className={cn(
            "mb-6 flex justify-between items-end",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div className={isRTL ? "text-right" : "text-left"}>
            <h2 className="text-2xl font-black tracking-tight text-foreground mb-1">
              {t("dashboard.realTimePanel")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("dashboard.liveStatus")}</p>
          </div>

          <button
            type="button"
            onClick={toggleCompact}
            className="p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            title={isCompact ? "Grid View" : "Compact View"}
          >
            {isCompact ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>

        <div
          className={cn(
            "grid gap-5",
            isCompact
              ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          )}
        >
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              session={device.sessions[0]}
              allDevices={devices}
              deviceTypes={deviceTypes}
              isCompact={isCompact}
              activeShift={activeShift}
              onMutationComplete={refreshFromServer}
              showQrButton={showDeviceQr}
              menuBaseUrl={appBaseUrl}
            />
          ))}
        </div>
      </section>

      {/* --- Pending Orders Floating Panel --- */}
      {(() => {
        const pendingOrders = devices.flatMap(d => {
          const session = d.sessions[0];
          if (!session) return [];
          return session.orders
            .filter(o => o.status === "PENDING")
            .map(o => ({ ...o, deviceNumber: d.number, deviceId: d.id, sessionId: session.id }));
        });

        if (pendingOrders.length === 0) return null;

        return (
          <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-background/95 backdrop-blur-xl border-2 border-amber-500/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-black text-amber-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                {isRTL ? "طلبات معلقة" : "Pending Orders"} ({pendingOrders.length})
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {pendingOrders.map(o => (
                <div key={o.id} className="bg-card border border-border rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-foreground text-sm">{o.inventoryItem?.name} <span className="text-amber-500 font-black">x{o.quantity}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRTL ? "جهاز رقم" : "Device"} <span className="font-bold text-foreground">#{o.deviceNumber}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => {
                        const { confirmPendingOrder } = await import("@/app/actions/customer-menu.actions");
                        const res = await confirmPendingOrder(o.id);
                        if(res.success) {
                          import("sonner").then(({ toast }) => toast.success(isRTL ? "تم التأكيد وإضافته للفاتورة" : "Confirmed & Added to bill"));
                          refreshFromServer();
                        } else {
                          import("sonner").then(({ toast }) => toast.error(res.message));
                        }
                      }}
                      className="flex-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      {isRTL ? "تأكيد وتقديم" : "Confirm"}
                    </button>
                    <button
                      onClick={async () => {
                        const { cancelPendingOrder } = await import("@/app/actions/customer-menu.actions");
                        const res = await cancelPendingOrder(o.id);
                        if(res.success) {
                          refreshFromServer();
                        } else {
                          import("sonner").then(({ toast }) => toast.error(res.message));
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
      })()}
    </div>
  );
}
