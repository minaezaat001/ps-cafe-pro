"use client";

import React, { useState, useTransition, useEffect } from "react";
import { openShift, closeShift, logout } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardList, Clock, Gamepad2, Coffee,
  TrendingUp, TrendingDown, MinusCircle,
  RefreshCw, LogIn, X, ShieldCheck,
  User, Calendar, Printer, Eye, Activity,
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useKeyPress } from "@/lib/useKeyPress";

interface ShiftSummary {
  gaming: number;
  cafeteria: number;
  income: number;
  expenses: number;
  totalRevenue: number;
  expectedCash: number;
  openingFloat: number;
  sessionCount: number;
  transactionCount: number;
}

interface ShiftClientProps {
  activeShift: any;
  summary: ShiftSummary | null;
  shiftHistory: any[];
}

export default function ShiftClient({ activeShift, summary, shiftHistory }: ShiftClientProps) {
  const { isRTL } = useLang();
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Open shift modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");

  // Close shift modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Detail modal for history
  const [detailShift, setDetailShift] = useState<any | null>(null);

  // ── Auto-Refresh every 30 seconds ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  // ── Auto-Popup Interceptor logic ───────────────────────────────────
  useEffect(() => {
    if (activeShift && searchParams.get("pending") === "logout") {
      setShowCloseModal(true);
    }
  }, [searchParams, activeShift]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // ── Computed values ─────────────────────────────────────────────────
  const expectedCash = summary?.expectedCash ?? 0;
  const actualNum = parseFloat(actualCash) || 0;
  const variance = actualNum - expectedCash;
  const totalGaming = summary?.gaming ?? 0;

  // ── Keyboard Shortcuts ──────────────────────────────────────────────
  useKeyPress("Escape", () => {
    if (isPending) return;
    if (showOpenModal) setShowOpenModal(false);
    if (showCloseModal) setShowCloseModal(false);
    if (detailShift) setDetailShift(null);
  }, showOpenModal || showCloseModal || detailShift !== null);

  useKeyPress("Enter", () => {
    if (isPending) return;
    if (showOpenModal) {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "BUTTON") return;
      handleOpenShift();
    }
    if (showCloseModal) {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "BUTTON") return;
      handleCloseShift();
    }
  }, showOpenModal || showCloseModal);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleOpenShift = () => {
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) { toast.error(isRTL ? "يرجى إدخال مبلغ صحيح" : "Enter a valid amount"); return; }
    startTransition(async () => {
      try {
        await openShift(float);
        toast.success(isRTL ? "تم فتح الوردية ✅" : "Shift opened ✅");
        setShowOpenModal(false); setOpeningFloat(""); router.refresh();
      } catch (err: any) { toast.error(err.message); }
    });
  };

  const handleCloseShift = () => {
    const cash = parseFloat(actualCash);
    if (isNaN(cash) || cash < 0) { toast.error(isRTL ? "يرجى إدخال المبلغ الفعلي" : "Enter actual cash"); return; }
    startTransition(async () => {
      try {
        const result = await closeShift(activeShift.id, cash, closeNotes || undefined);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const v = result.variance;
        const msg = v >= 0 ? `زيادة +${v.toFixed(2)} ج` : `عجز ${v.toFixed(2)} ج`;
        toast.success(`تم إغلاق الوردية — ${msg}`);
        setShowCloseModal(false); setActualCash(""); setCloseNotes("");

        if (searchParams.get("pending") === "logout") {
          await logout();
        } else {
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err?.message ?? (isRTL ? "تعذر إغلاق الوردية" : "Failed to close shift"));
      }
    });
  };

  // ── UI Helpers ───────────────────────────────────────────────────────
  const varianceColor = variance > 0.5 ? "text-emerald-400" : variance < -0.5 ? "text-red-400" : "text-amber-400";
  const varianceIcon = variance > 0.5 ? <TrendingUp className="w-5 h-5" /> : variance < -0.5 ? <TrendingDown className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />;

  const SummaryCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) => (
    <div className="glass-card p-4 rounded-2xl flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>{icon}</div>
      <div className={isRTL ? "text-right" : "text-left"}>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-foreground font-mono leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );

  const VarianceBadge = ({ v }: { v: number }) => {
    const color = v > 0.5 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : v < -0.5 ? "text-red-400 bg-red-500/10 border-red-500/20"
      : "text-amber-400 bg-amber-500/10 border-amber-500/20";
    const icon = v > 0.5 ? <CheckCircle2 className="w-3 h-3" /> : v < -0.5 ? <AlertTriangle className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />;
    const label = v > 0.5 ? `+${v.toFixed(2)}` : v.toFixed(2);
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full border", color)}>
        {icon} {label} ج
      </span>
    );
  };

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Header ── */}
      <div className={cn("flex justify-between items-start flex-wrap gap-3", isRTL && "flex-row-reverse")}>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-blue-400" />
            {isRTL ? "إدارة الورديات" : "Shift Management"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? "X-Report — تتبع صندوق الكاشير لحظياً" : "X-Report — Real-time cash drawer tracking"}
          </p>
        </div>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <button onClick={handleManualRefresh}
            className={cn("p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all", isRefreshing && "animate-spin")}>
            <RefreshCw className="w-4 h-4" />
          </button>
          {!activeShift && (
            <button onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-white text-sm shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
              <LogIn className="w-4 h-4" />
              {isRTL ? "فتح وردية" : "Open Shift"}
            </button>
          )}
        </div>
      </div>

      {/* ── Active Shift Card ── */}
      {activeShift ? (
        <div className="glass-card rounded-3xl p-6 border-t-4" style={{ borderTopColor: "#3b82f6" }}>

          {/* Shift Meta row */}
          <div className={cn("flex flex-wrap justify-between items-start gap-3 mb-6", isRTL && "flex-row-reverse")}>
            <div className={isRTL ? "text-right" : ""}>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase tracking-widest">
                  <Activity className="w-3 h-3 animate-pulse" />
                  {isRTL ? "وردية مفتوحة" : "Active Shift"}
                </span>
                {!summary && (
                   <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase tracking-widest">
                   {isRTL ? "جاري تحميل البيانات..." : "Loading data..."}
                 </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <User className="w-3.5 h-3.5" />
                <span className="font-bold text-foreground">{activeShift.openedByUser?.username}</span>
                <span>•</span>
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(activeShift.openedAt), "dd/MM/yyyy HH:mm")}
                <span>•</span>
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(activeShift.openedAt), { addSuffix: true, locale: isRTL ? ar : undefined })}
              </p>
            </div>
            <div className={cn("flex gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
              <button onClick={() => window.open(`/print/shift/${activeShift.id}`, "_blank")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-border hover:bg-muted transition-colors">
                <Printer className="w-3.5 h-3.5" />
                {isRTL ? "طباعة X-Report" : "Print X-Report"}
              </button>
              <button onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                <ShieldCheck className="w-4 h-4" />
                {isRTL ? "إغلاق الوردية" : "Close Shift"}
              </button>
            </div>
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SummaryCard
              icon={<Gamepad2 className="w-5 h-5 text-violet-400" />}
              label={isRTL ? "إيراد الألعاب" : "Gaming"}
              value={`${(summary?.gaming ?? 0).toFixed(2)} ج`}
              color="bg-violet-500/10"
            />
            <SummaryCard
              icon={<Coffee className="w-5 h-5 text-amber-400" />}
              label={isRTL ? "الكافيتريا" : "Cafeteria"}
              value={`${(summary?.cafeteria ?? 0).toFixed(2)} ج`}
              color="bg-amber-500/10"
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              label={isRTL ? "إيرادات أخرى" : "Income"}
              value={`+${(summary?.income ?? 0).toFixed(2)} ج`}
              color="bg-emerald-500/10"
            />
            <SummaryCard
              icon={<TrendingDown className="w-5 h-5 text-red-400" />}
              label={isRTL ? "مصروفات" : "Expenses"}
              value={`-${(summary?.expenses ?? 0).toFixed(2)} ج`}
              color="bg-red-500/10"
            />
          </div>

          {/* Expected Cash Big Display */}
          <div className="rounded-2xl p-5 text-center" style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.05))",
            border: "1px solid rgba(59,130,246,0.2)"
          }}>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              💵 {isRTL ? "المبلغ المتوقع في الصندوق" : "Expected Cash in Drawer"}
            </p>
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-black text-blue-400 font-mono tracking-tighter leading-none">
                {(summary?.expectedCash ?? 0).toFixed(2)}
              </span>
              <span className="text-lg text-muted-foreground font-bold pb-1">EGP</span>
            </div>
            {summary && (
              <p className="text-xs text-muted-foreground mt-2">
                {isRTL
                  ? `عهدة البداية ${summary.openingFloat.toFixed(2)} + إيرادات ${summary.totalRevenue.toFixed(2)}`
                  : `Float ${summary.openingFloat.toFixed(2)} + Revenue ${summary.totalRevenue.toFixed(2)}`}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
              {isRTL ? `يتحدّث تلقائياً كل 30 ثانية` : "Auto-refreshes every 30s"}
            </p>
          </div>
        </div>
      ) : !activeShift ? (
        <div className="glass-card rounded-3xl p-12 text-center border-2 border-dashed border-border">
          <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-black text-foreground mb-2">{isRTL ? "لا توجد وردية مفتوحة" : "No Active Shift"}</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {isRTL ? "افتح وردية جديدة لبدء تتبع الصندوق" : "Open a new shift to start tracking the cash drawer"}
          </p>
          <button onClick={() => setShowOpenModal(true)}
            className="mx-auto flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
            <LogIn className="w-4 h-4" />
            {isRTL ? "فتح وردية جديدة" : "Open New Shift"}
          </button>
        </div>
      ) : null}

      {/* ── Shift History ── */}
      {shiftHistory.length > 0 && (
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            {isRTL ? "سجل الورديات المغلقة" : "Shift History"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    isRTL ? "التاريخ" : "Date",
                    isRTL ? "فُتح بواسطة" : "Opened By",
                    isRTL ? "المتوقع" : "Expected",
                    isRTL ? "الفعلي" : "Actual",
                    isRTL ? "الفرق" : "Variance",
                    isRTL ? "الإجراءات" : "Actions",
                  ].map((h) => (
                    <th key={h} className="text-start text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((shift: any) => {
                  const v = shift.variance ?? 0;
                  return (
                    <tr key={shift.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
                        {format(new Date(shift.closedAt || shift.openedAt), "dd/MM/yy HH:mm")}
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">{shift.openedByUser?.username}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{shift.expectedCash?.toFixed(2)} ج</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{shift.actualCash?.toFixed(2)} ج</td>
                      <td className="py-3 px-3">
                        <VarianceBadge v={v} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailShift(shift)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title={isRTL ? "عرض التفاصيل" : "View Details"}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(`/print/shift/${shift.id}`, "_blank")}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-400 transition-colors"
                            title={isRTL ? "طباعة" : "Print"}>
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {detailShift && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailShift(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="glass-card w-full max-w-md p-6 rounded-2xl relative z-[10000] border-t-4 max-h-[85vh] overflow-y-auto scrollbar-hide"
              style={{ borderTopColor: "#6366f1" }}
              dir={isRTL ? "rtl" : "ltr"}>
              <div className={cn("flex justify-between items-center mb-5", isRTL && "flex-row-reverse")}>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-violet-400" />
                  {isRTL ? "تفاصيل الوردية" : "Shift Details"}
                </h2>
                <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                  <button onClick={() => window.open(`/print/shift/${detailShift.id}`, "_blank")}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-blue-400 transition-colors">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDetailShift(null)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Status Badge */}
                <div className="text-center mb-4">
                  <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full border",
                    detailShift.status === "OPEN"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      : "bg-slate-500/15 text-muted-foreground border-border")}>
                    {detailShift.status === "OPEN" ? "🟢 مفتوحة" : "🔴 مغلقة"}
                  </span>
                </div>

                {[
                  { label: isRTL ? "رقم الوردية" : "Shift ID", value: detailShift.id.slice(-12).toUpperCase() },
                  { label: isRTL ? "فُتحت بواسطة" : "Opened By", value: detailShift.openedByUser?.username },
                  { label: isRTL ? "وقت الفتح" : "Opened At", value: format(new Date(detailShift.openedAt), "EEEE dd/MM/yyyy — HH:mm") },
                  detailShift.closedAt && { label: isRTL ? "أُغلقت بواسطة" : "Closed By", value: detailShift.closedByUser?.username || detailShift.openedByUser?.username },
                  detailShift.closedAt && { label: isRTL ? "وقت الإغلاق" : "Closed At", value: format(new Date(detailShift.closedAt), "EEEE dd/MM/yyyy — HH:mm") },
                  { label: isRTL ? "عهدة البداية" : "Opening Float", value: `${detailShift.openingFloat?.toFixed(2)} ج` },
                  { label: isRTL ? "المتوقع" : "Expected", value: `${detailShift.expectedCash?.toFixed(2)} ج` },
                  detailShift.actualCash !== null && { label: isRTL ? "الفعلي" : "Actual", value: `${detailShift.actualCash?.toFixed(2)} ج` },
                ].filter(Boolean).map((row: any, i) => (
                  <div key={i} className={cn("flex justify-between items-center py-2 border-b border-border/50", isRTL && "flex-row-reverse")}>
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{row.label}</span>
                    <span className="font-bold text-foreground text-sm">{row.value}</span>
                  </div>
                ))}

                {/* Variance Display */}
                {detailShift.variance !== null && (
                  <div className={cn("flex justify-between items-center py-3 rounded-xl px-3",
                    detailShift.variance > 0.5 ? "bg-emerald-500/10" : detailShift.variance < -0.5 ? "bg-red-500/10" : "bg-amber-500/10",
                    isRTL && "flex-row-reverse")}>
                    <span className={cn("text-[11px] font-black uppercase tracking-widest",
                      detailShift.variance > 0.5 ? "text-emerald-400" : detailShift.variance < -0.5 ? "text-red-400" : "text-amber-400")}>
                      {detailShift.variance > 0.5 ? (isRTL ? "زيادة" : "Surplus") : detailShift.variance < -0.5 ? (isRTL ? "عجز" : "Deficit") : (isRTL ? "تطابق" : "Exact")}
                    </span>
                    <span className={cn("text-xl font-black font-mono",
                      detailShift.variance > 0.5 ? "text-emerald-400" : detailShift.variance < -0.5 ? "text-red-400" : "text-amber-400")}>
                      {detailShift.variance >= 0 ? "+" : ""}{detailShift.variance.toFixed(2)} ج
                    </span>
                  </div>
                )}

                {/* Notes */}
                {detailShift.notes && (
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">{isRTL ? "ملاحظات" : "Notes"}</p>
                    <p className="text-sm text-foreground">{detailShift.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Open Shift Modal ── */}
      <AnimatePresence>
        {showOpenModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowOpenModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-[10000] border-t-4"
              style={{ borderTopColor: "#3b82f6" }}
              dir={isRTL ? "rtl" : "ltr"}>
              <div className={cn("flex justify-between items-center mb-6", isRTL && "flex-row-reverse")}>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-blue-400" />
                  {isRTL ? "فتح وردية جديدة" : "Open New Shift"}
                </h2>
                <button onClick={() => setShowOpenModal(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                💵 {isRTL ? "عهدة البداية (Opening Float)" : "Opening Float"}
              </label>
              <input type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} autoFocus placeholder="0.00"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-2xl font-black font-mono outline-none focus:border-blue-500/50 transition-colors text-foreground mb-6" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowOpenModal(false)} className="py-3 rounded-xl font-bold border border-border text-foreground hover:bg-muted transition-colors">
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={handleOpenShift} disabled={isPending}
                  className="py-3 rounded-xl font-black text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                  {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isRTL ? "فتح الوردية" : "Open Shift")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Close Shift Modal ── */}
      <AnimatePresence>
        {showCloseModal && summary && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCloseModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-[10000] border-t-4"
              style={{ borderTopColor: "#ef4444" }}
              dir={isRTL ? "rtl" : "ltr"}>
              <div className={cn("flex justify-between items-center mb-5", isRTL && "flex-row-reverse")}>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-red-400" />
                  {isRTL ? "إغلاق الوردية" : "Close Shift"}
                </h2>
                <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 text-center">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">{isRTL ? "المبلغ المتوقع" : "Expected Cash"}</p>
                <p className="text-3xl font-black text-blue-400 font-mono">{expectedCash.toFixed(2)} ج</p>
              </div>

              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                {isRTL ? "المبلغ الفعلي في الصندوق" : "Actual Cash in Drawer"}
              </label>
              <input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} autoFocus placeholder="0.00"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-2xl font-black font-mono outline-none focus:border-blue-500/50 transition-colors text-foreground mb-3" />

              {actualCash !== "" && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex items-center justify-center gap-2 py-2 px-4 rounded-xl mb-4 font-black text-base",
                    variance > 0.5 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : variance < -0.5 ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                  {varianceIcon}
                  {variance > 0.5 ? `${isRTL ? "زيادة" : "Surplus"} +${variance.toFixed(2)} ج`
                    : variance < -0.5 ? `${isRTL ? "عجز" : "Deficit"} ${variance.toFixed(2)} ج`
                    : isRTL ? "تطابق تام ✓" : "Exact Match ✓"}
                </motion.div>
              )}

              <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)}
                placeholder={isRTL ? "ملاحظات اختيارية..." : "Optional notes..."} rows={2}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50 transition-colors text-foreground placeholder:text-muted-foreground/50 resize-none mb-4" />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCloseModal(false)} className="py-3 rounded-xl font-bold border border-border text-foreground hover:bg-muted transition-colors">
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={handleCloseShift} disabled={isPending || !actualCash}
                  className="py-3 rounded-xl font-black text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isRTL ? "تأكيد الإغلاق" : "Confirm Close")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
