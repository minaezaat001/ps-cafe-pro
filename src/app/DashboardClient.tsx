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

  useEffect(() => {
    const saved = localStorage.getItem("pscafe_isCompact");
    if (saved) setIsCompact(saved === "true");
  }, []);

  useEffect(() => {
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
      revRef.current = r.revision;
      setDevices(r.devices);
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
    </div>
  );
}
