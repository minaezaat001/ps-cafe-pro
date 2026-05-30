"use client";

import React, { useState } from 'react';
import {
  Trash2,
  RefreshCcw,
  Settings,
  Database,
  ShieldAlert,
  CheckCircle2,
  X,
  Download,
  Upload,
  CalendarDays,
  CalendarOff,
  Save,
  Printer,
  ChevronRight,
  FileText,
  Globe,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Copy,
  Eye,
  EyeOff,
  Type,
  Layers,
} from "lucide-react";
import { usePrintSettings, PrintPaperSize } from "@/lib/usePrintSettings";
import { useLang } from "@/lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { clearBillingData, factoryReset, clearOldData } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useKeyPress } from "@/lib/useKeyPress";
import TenantSettings from "@/components/TenantSettings";
import { cn } from "@/lib/utils";

type TabId = 'print' | 'data' | 'general';

// ═══════════════════════════════════════════════════════
// TOGGLE COMPONENT
// ═══════════════════════════════════════════════════════
const Toggle = ({
  checked,
  onChange,
  color = 'blue',
  size = 'md',
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  const sizes = {
    sm: { track: 'w-8 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3' },
    md: { track: 'w-11 h-6', thumb: 'w-4.5 h-4.5 w-[18px] h-[18px]', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-7' },
  };
  const s = sizes[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        s.track,
        'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
        checked ? `${colors[color]} focus:ring-${color}-500` : 'bg-white/10 focus:ring-white/20'
      )}
    >
      <span
        className={cn(
          s.thumb,
          'absolute left-[3px] rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? s.translate : ''
        )}
      />
    </button>
  );
};

// ═══════════════════════════════════════════════════════
// SECTION HEADER  
// ═══════════════════════════════════════════════════════
const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  color = 'blue',
}: {
  icon: any;
  title: string;
  subtitle?: string;
  color?: string;
}) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'shadow-blue-500/10' },
    purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'shadow-purple-500/10' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/10' },
    red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     glow: 'shadow-red-500/10' },
    teal:    { bg: 'bg-teal-500/10',    border: 'border-teal-500/20',    text: 'text-teal-400',    glow: 'shadow-teal-500/10' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', c.bg, c.border, 'shadow-lg', c.glow)}>
        <Icon className={cn('w-4 h-4', c.text)} strokeWidth={2} />
      </div>
      <div>
        <h3 className={cn('text-sm font-bold tracking-wide uppercase', c.text)}>{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PAPER SIZE SELECTOR
// ═══════════════════════════════════════════════════════
const PaperSizeSelector = ({
  value,
  onChange,
  isRTL,
}: {
  value: PrintPaperSize;
  onChange: (size: PrintPaperSize) => void;
  isRTL: boolean;
}) => {
  const options: { id: PrintPaperSize; label: string; sublabel: string; width: string; desc: string }[] = [
    {
      id: 'THERMAL_58MM',
      label: '58mm',
      sublabel: isRTL ? 'حراري صغير' : 'Compact Thermal',
      width: 'w-8',
      desc: isRTL ? 'للطابعات الصغيرة' : 'Small POS printers',
    },
    {
      id: 'THERMAL_80MM',
      label: '80mm',
      sublabel: isRTL ? 'حراري قياسي' : 'Standard Thermal',
      width: 'w-12',
      desc: isRTL ? 'الأكثر شيوعاً' : 'Most common',
    },
    {
      id: 'A4',
      label: 'A4',
      sublabel: isRTL ? 'ورق عادي' : 'Standard Paper',
      width: 'w-16',
      desc: isRTL ? 'طابعة ليزر/حبر' : 'Laser/Inkjet',
    },
  ];
  return (
    <div className={cn('flex gap-3')}>
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex-1 relative group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200',
              isActive
                ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                : 'border-border/40 bg-card/30 hover:border-border/70 hover:bg-card/50'
            )}
          >
            {/* visual paper representation */}
            <div className="flex items-end justify-center h-12 pb-1">
              <div
                className={cn(
                  'rounded-sm border-2 transition-all',
                  opt.id === 'A4' ? 'w-10 h-14' : opt.id === 'THERMAL_80MM' ? 'w-8 h-10' : 'w-6 h-10',
                  isActive ? 'border-blue-400 bg-blue-500/5' : 'border-muted-foreground/30 bg-muted/20'
                )}
              >
                {/* paper lines */}
                <div className="p-1 space-y-0.5 mt-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn('h-px rounded', isActive ? 'bg-blue-400/40' : 'bg-muted-foreground/20')} />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className={cn('text-sm font-bold', isActive ? 'text-blue-400' : 'text-foreground')}>
                {opt.label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{opt.sublabel}</div>
            </div>
            {isActive && (
              <div className={cn("absolute top-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center", 'end-2')}>
                <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// DANGER ACTION CARD
// ═══════════════════════════════════════════════════════
const DangerCard = ({
  icon: Icon,
  title,
  description,
  btnLabel,
  color,
  onClick,
  isRTL,
}: {
  icon: any;
  title: string;
  description: string;
  btnLabel: string;
  color: 'red' | 'blue' | 'amber' | 'teal';
  onClick: () => void;
  isRTL: boolean;
}) => {
  const colorMap = {
    red:   { bg: 'bg-red-500/8',   border: 'border-red-500/15',   icon: 'bg-red-500/10 border-red-500/20 text-red-400',   btn: 'border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500' },
    blue:  { bg: 'bg-blue-500/8',  border: 'border-blue-500/15',  icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400', btn: 'border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500' },
    amber: { bg: 'bg-amber-500/8', border: 'border-amber-500/15', icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400', btn: 'border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500' },
    teal:  { bg: 'bg-teal-500/8',  border: 'border-teal-500/15',  icon: 'bg-teal-500/10 border-teal-500/20 text-teal-400', btn: 'border-teal-500/30 text-teal-400 hover:bg-teal-500 hover:text-white hover:border-teal-500' },
  };
  const c = colorMap[color];
  return (
    <div className={cn('rounded-2xl border p-5 flex gap-4', c.bg, c.border)}>
      <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0', c.icon)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className={cn('flex-1 min-w-0')}>
        <h4 className="text-sm font-bold text-foreground mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>
        <button
          onClick={onClick}
          className={cn(
            'px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-200',
            c.btn
          )}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function SettingsClient() {
  const { t, isRTL } = useLang();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('print');
  const [isPending, setIsPending] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'CLEAR' | 'RESET' | 'CLEAR_OLD' | null>(null);
  const [backupModal, setBackupModal] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    settings: true,
    inventory: true,
    reports: true,
    finance: true,
  });
  const [tenantSettings, setTenantSettings] = useState({
    currency: "EGP",
    currencySymbol: "ج.م",
    timezone: "Africa/Cairo"
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const {
    settings: printSettings,
    updateSettings: updatePrintSettings,
    isLoaded: printLoaded,
    availablePrinters,
    resetToDefaults: resetPrintDefaults,
  } = usePrintSettings();

  // ── Keyboard Shortcuts ─────────────────────────────────
  // Escape → close active modal
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (confirmModal) setConfirmModal(null);
    else if (backupModal) setBackupModal(false);
  }, !!(confirmModal || backupModal));

  // Enter → confirm active modal
  useKeyPress('Enter', () => {
    if (isPending) return;
    if (confirmModal) handleAction(confirmModal);
    else if (backupModal) {
      const hasSelection = Object.values(backupOptions).some(v => v);
      if (hasSelection) handleExportBackup();
    }
  }, !!(confirmModal || backupModal));

  const handleAction = async (type: 'CLEAR' | 'RESET' | 'CLEAR_OLD') => {
    setIsPending(true);
    try {
      if (type === 'CLEAR') {
        const res = await clearBillingData();
        if (res.success) toast.success(t('settings.success'));
      } else if (type === 'RESET') {
        const res = await factoryReset();
        if (res.success) {
          toast.success(isRTL ? "تم إرجاع النظام للصفر بنجاح." : "Factory reset complete.");
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } else if (type === 'CLEAR_OLD') {
        const res = await clearOldData(90);
        if (res.success) toast.success(isRTL ? 'تم مسح الفواتير القديمة بأمان' : 'Old data cleared successfully');
      }
    } catch {
      toast.error(isRTL ? 'حدث خطأ ما' : 'An error occurred');
    } finally {
      setIsPending(false);
      setConfirmModal(null);
    }
  };

  const handleExportBackup = async () => {
    setIsPending(true);
    try {
      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupOptions),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ps_cafe_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(isRTL ? 'تم تصدير النسخة الاحتياطية بنجاح' : 'Backup exported successfully');
      setBackupModal(false);
    } catch {
      toast.error(isRTL ? 'حدث خطأ أثناء التصدير' : 'Export failed');
    } finally {
      setIsPending(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsPending(true);
        const json = JSON.parse(event.target?.result as string);
        const response = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });
        if (!response.ok) throw new Error('Import failed');
        toast.success(isRTL ? 'تم استعادة البيانات بنجاح!' : 'Data restored successfully!');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error(isRTL ? 'خطأ في قراءة ملف النسخة' : 'Failed to import backup');
      } finally {
        setIsPending(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Load tenant settings on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings/tenant');
        if (res.ok) {
          const data = await res.json();
          setTenantSettings(data);
        }
      } catch (error) {
        console.error('Failed to load tenant settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const handleUpdateTenantSettings = async () => {
    try {
      setIsPending(true);
      const reason = prompt(isRTL ? 'سبب التعديل:' : 'Reason for change:') || 'Tenant settings updated';
      const res = await fetch('/api/settings/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tenantSettings, reason }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(isRTL ? 'تم تحديث الإعدادات بنجاح' : 'Settings updated successfully');
    } catch {
      toast.error(isRTL ? 'فشل في تحديث الإعدادات' : 'Failed to update settings');
    } finally {
      setIsPending(false);
    }
  };

  const tabs: { id: TabId; label: string; labelEn: string; icon: any; badge?: string }[] = [
    { id: 'print',  label: 'إعدادات الطباعة', labelEn: 'Print Settings',  icon: Printer },
    { id: 'data',   label: 'إدارة البيانات',   labelEn: 'Data Management', icon: Database,  badge: '!' },
    { id: 'general', label: 'إعدادات عامة', labelEn: 'General Settings', icon: Globe },
  ];

  return (
    <div className="max-w-5xl mx-auto py-4" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── PAGE HEADER ─────────────────────────────────── */}
      <div className="mb-8">
        <div className={cn('flex items-center gap-3 mb-2')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-lg">
            <Settings className="w-5 h-5 text-blue-400" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              {isRTL ? 'إعدادات النظام' : 'System'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {isRTL ? '' : 'Settings'}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'تكوين النظام وإعدادات الطباعة وإدارة البيانات' : 'Configure printing, manage system data and preferences'}
            </p>
          </div>
        </div>
      </div>

      {/* ── LAYOUT: TABS + CONTENT ───────────────────────── */}
      <div className={cn('flex gap-6')}>

        {/* ── SIDEBAR TABS ──────────────────────────────── */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1 sticky top-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold relative group',
                    'text-start',
                    isActive
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  {/* active indicator bar */}
                  {isActive && (
                    <span
                      className={cn(
                        'absolute top-2 bottom-2 w-0.5 rounded-full bg-blue-400',
                        'start-0'
                      )}
                    />
                  )}
                  <tab.icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                  <span className="flex-1 leading-tight">
                    {isRTL ? tab.label : tab.labelEn}
                  </span>
                  {tab.badge && !isActive && (
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-black flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* version badge */}
            <div className="pt-4 mt-4 border-t border-border/30">
              <div className="px-4 py-3 rounded-xl bg-card/30 border border-border/20">
                <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-widest">
                  {isRTL ? 'الإصدار' : 'Version'}
                </p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">PS Cafe Pro v2.0</p>
              </div>
            </div>
          </nav>
        </div>

        {/* ── CONTENT PANEL ─────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >

              {/* ════════════════════════════════════════════ */}
              {/* TAB: PRINT SETTINGS                         */}
              {/* ════════════════════════════════════════════ */}
              {activeTab === 'print' && printLoaded && (
                <div className="space-y-5">

                  {/* ── Master Toggle ─────────────────────── */}
                  <div className={cn(
                    'glass-card rounded-2xl p-6 flex items-center gap-5 border transition-all',
                    printSettings.enabled ? 'border-blue-500/25 bg-blue-500/5' : 'border-border/30',
                  )}>
                    <div className={cn(
                      'w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all',
                      printSettings.enabled ? 'bg-blue-500/15 border-blue-500/30' : 'bg-card/50 border-border/30'
                    )}>
                      <Printer className={cn('w-7 h-7 transition-colors', printSettings.enabled ? 'text-blue-400' : 'text-muted-foreground/50')} strokeWidth={1.5} />
                    </div>
                    <div className={cn('flex-1')}>
                      <h3 className="text-base font-bold text-foreground">
                        {isRTL ? 'نظام الطباعة' : 'Printing System'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRTL
                          ? printSettings.enabled ? 'نظام الطباعة مفعّل — سيظهر زر الطباعة في الكاشير' : 'قم بتفعيل نظام الطباعة لإضافة خيارات الإيصالات'
                          : printSettings.enabled ? 'Printing is active — receipt button shown at checkout' : 'Enable to show print options at checkout'}
                      </p>
                    </div>
                    <Toggle
                      checked={printSettings.enabled}
                      onChange={(v) => updatePrintSettings({ enabled: v })}
                      color="blue"
                      size="lg"
                    />
                  </div>

                  {/* ── Settings Panel (disabled when off) ── */}
                  <div className={cn('space-y-5 transition-opacity duration-300', !printSettings.enabled && 'opacity-40 pointer-events-none select-none')}>

                    {/* PAPER SIZE */}
                    <div className="glass-card rounded-2xl p-6 border border-border/30">
                      <SectionHeader
                        icon={Layers}
                        title={isRTL ? 'حجم ورق الطابعة' : 'Paper Size'}
                        subtitle={isRTL ? 'اختر حجم الورق المناسب لطابعتك' : 'Select the paper format for your printer'}
                        color="blue"
                      />
                      <PaperSizeSelector
                        value={printSettings.paperSize}
                        onChange={(size) => updatePrintSettings({ paperSize: size })}
                        isRTL={isRTL}
                      />
                    </div>

                    {/* PRINTER SELECTION + AUTO PRINT */}
                    <div className="glass-card rounded-2xl p-6 border border-border/30">
                      <SectionHeader
                        icon={Sliders}
                        title={isRTL ? 'خيارات الطابعة' : 'Printer Options'}
                        subtitle={isRTL ? 'الطابعة المستخدمة وسلوك الطباعة' : 'Target printer and print behavior'}
                        color="purple"
                      />
                      <div className="space-y-5">

                        {/* Printer Name Dropdown */}
                        <div>
                          <label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block')}>
                            {isRTL ? 'اسم الطابعة' : 'Printer Name'}
                          </label>
                          <select
                            value={printSettings.printerName}
                            onChange={(e) => updatePrintSettings({ printerName: e.target.value })}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium',
                              'focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all'
                            )}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          >
                            <option value="">{isRTL ? '— طابعة النظام الافتراضية —' : '— System Default Printer —'}</option>
                            {availablePrinters.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <p className={cn('text-[10px] text-muted-foreground/60 mt-2')}>
                            {isRTL
                              ? 'إذا تركت الحقل فارغاً سيستخدم النظام الطابعة الافتراضية'
                              : 'Leave blank to use the OS default printer'}
                          </p>
                        </div>

                        {/* Copies */}
                        <div>
                          <label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block')}>
                            {isRTL ? 'عدد النسخ' : 'Number of Copies'}
                          </label>
                          <div className={cn('flex items-center gap-3')}>
                            <button
                              onClick={() => updatePrintSettings({ copies: Math.max(1, (printSettings.copies || 1) - 1) })}
                              className="w-9 h-9 rounded-xl border border-border/50 bg-card/50 text-foreground font-bold flex items-center justify-center hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
                            >−</button>
                            <div className="min-w-[3rem] text-center">
                              <span className="text-2xl font-black text-foreground tabular-nums">{printSettings.copies || 1}</span>
                            </div>
                            <button
                              onClick={() => updatePrintSettings({ copies: Math.min(5, (printSettings.copies || 1) + 1) })}
                              className="w-9 h-9 rounded-xl border border-border/50 bg-card/50 text-foreground font-bold flex items-center justify-center hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
                            >+</button>
                            <span className="text-xs text-muted-foreground">{isRTL ? 'نسخة / إيصال' : 'copy per receipt'}</span>
                          </div>
                        </div>

                        {/* Auto Print Toggle */}
                        <div className={cn('flex items-center gap-4 p-4 rounded-xl bg-card/30 border border-border/20')}>
                          <Toggle
                            checked={printSettings.autoPrint}
                            onChange={(v) => updatePrintSettings({ autoPrint: v })}
                            color="purple"
                          />
                          <div className={cn('flex-1')}>
                            <p className="text-sm font-semibold text-foreground">
                              {isRTL ? 'طباعة تلقائية عند الإنهاء' : 'Auto-Print on Checkout'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isRTL ? 'يحدد خيار الطباعة تلقائياً عند إنهاء الجلسة' : 'Pre-checks the print option in the checkout modal'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECEIPT CUSTOMIZATION */}
                    <div className="glass-card rounded-2xl p-6 border border-border/30">
                      <SectionHeader
                        icon={FileText}
                        title={isRTL ? 'تخصيص الإيصال' : 'Receipt Customization'}
                        subtitle={isRTL ? 'النص الذي يظهر في رأس وتذييل الإيصال' : 'Header and footer text on printed receipts'}
                        color="teal"
                      />
                      <div className="space-y-4">

                        {/* Header Text */}
                        <div>
                          <label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block')}>
                            {isRTL ? 'نص رأس الإيصال (اسم المقهى)' : 'Receipt Header (Cafe Name)'}
                          </label>
                          <input
                            type="text"
                            value={printSettings.headerText}
                            onChange={(e) => updatePrintSettings({ headerText: e.target.value })}
                            placeholder={isRTL ? 'اسم مقهاك هنا...' : 'Your cafe name here...'}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium placeholder:text-muted-foreground/40',
                              'focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all'
                            )}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>

                        {/* Footer Text */}
                        <div>
                          <label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block')}>
                            {isRTL ? 'نص تذييل الإيصال' : 'Receipt Footer'}
                          </label>
                          <input
                            type="text"
                            value={printSettings.footerText}
                            onChange={(e) => updatePrintSettings({ footerText: e.target.value })}
                            placeholder={isRTL ? 'رسالة شكر أو معلومات التواصل...' : 'Thank you message or contact info...'}
                            className={cn(
                              'w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium placeholder:text-muted-foreground/40',
                              'focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10 transition-all'
                            )}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          <p className={cn('text-[10px] text-muted-foreground/50 mt-1.5')}>
                            {isRTL ? 'مثال: شكراً لزيارتكم • 01234567890' : 'E.g. Thank you • Call us: 01234567890'}
                          </p>
                        </div>

                        {/* Show Logo Toggle */}
                        <div className={cn('flex items-center gap-4 p-4 rounded-xl bg-card/30 border border-border/20')}>
                          <Toggle
                            checked={printSettings.showLogo}
                            onChange={(v) => updatePrintSettings({ showLogo: v })}
                            color="emerald"
                          />
                          <div className={cn('flex-1')}>
                            <p className="text-sm font-semibold text-foreground">
                              {isRTL ? 'إظهار اسم النظام في الرأس' : 'Show System Name in Header'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isRTL ? 'يُظهر "PS CAFE PRO" في أعلى الإيصال' : 'Displays "PS CAFE PRO" at the top of each receipt'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECEIPT PREVIEW */}
                    <div className="glass-card rounded-2xl p-6 border border-border/30">
                      <SectionHeader
                        icon={Eye}
                        title={isRTL ? 'معاينة الإيصال' : 'Receipt Preview'}
                        subtitle={isRTL ? 'نموذج تقريبي لشكل الإيصال المطبوع' : 'A rough preview of how your receipt will look'}
                        color="amber"
                      />
                      <div className="flex justify-center">
                        <div
                          className={cn(
                            'bg-white text-black rounded-lg shadow-xl overflow-hidden font-mono text-center transition-all duration-300',
                            printSettings.paperSize === 'A4' ? 'w-64' : printSettings.paperSize === 'THERMAL_80MM' ? 'w-48' : 'w-36'
                          )}
                        >
                          <div className="bg-gray-900 px-3 py-1.5">
                            <div className={cn('flex gap-1', isRTL ? 'justify-start' : 'justify-end')}>
                              {[...Array(3)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-gray-600" />)}
                            </div>
                          </div>
                          <div className="p-3 space-y-2 text-[9px] leading-relaxed">
                            {printSettings.showLogo && (
                              <p className="text-[8px] text-gray-400 tracking-widest">PS CAFE PRO</p>
                            )}
                            <p className="font-bold text-[11px]">{printSettings.headerText || 'CAFE NAME'}</p>
                            <div className="border-t border-dashed border-gray-300 my-1" />
                            <div className="text-left space-y-0.5">
                              <div className="flex justify-between"><span>جلسة #001</span><span>45 دقيقة</span></div>
                              <div className="flex justify-between"><span>بيبسي ×2</span><span>20 ج.م.</span></div>
                            </div>
                            <div className="border-t border-dashed border-gray-300 my-1" />
                            <div className="flex justify-between font-bold text-[10px]">
                              <span>الإجمالي</span><span>85 ج.م.</span>
                            </div>
                            <div className="border-t border-dashed border-gray-300 my-1" />
                            <p className="text-[8px] text-gray-400">{printSettings.footerText}</p>
                          </div>
                          {/* paper tear effect */}
                          <div className="h-3 bg-gradient-to-b from-gray-100 to-transparent" />
                        </div>
                      </div>
                    </div>

                    {/* Reset defaults */}
                    <button
                      onClick={() => {
                        resetPrintDefaults();
                        toast.success(isRTL ? 'تم إعادة إعدادات الطباعة للافتراضي' : 'Print settings reset to defaults');
                      }}
                      className={cn(
                        'flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-card/50',
                      )}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isRTL ? 'إعادة ضبط إعدادات الطباعة' : 'Reset print settings to defaults'}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════ */}
              {/* TAB: DATA MANAGEMENT                        */}
              {/* ════════════════════════════════════════════ */}
              {activeTab === 'data' && (
                <div className="space-y-5">

                  {/* Warning Banner */}
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-bold text-amber-400">
                        {isRTL ? 'منطقة الإجراءات الحساسة' : 'Sensitive Operations Zone'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRTL
                          ? 'الإجراءات في هذا القسم دائمة ولا يمكن التراجع عنها. تأكد من تصدير نسخة احتياطية قبل أي حذف.'
                          : 'Actions in this section are permanent and irreversible. Export a backup before proceeding.'}
                      </p>
                    </div>
                  </div>

                  {/* Backup Section */}
                  <div className="glass-card rounded-2xl p-6 border border-border/30">
                    <SectionHeader
                      icon={Save}
                      title={isRTL ? 'النسخ الاحتياطي' : 'Backup & Restore'}
                      subtitle={isRTL ? 'تصدير واستعادة بيانات النظام' : 'Export and restore system data'}
                      color="teal"
                    />
                    <div className={cn('flex gap-3')}>
                      <button
                        onClick={() => setBackupModal(true)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-teal-500/30 bg-teal-500/8 text-teal-400 text-sm font-bold',
                          'hover:bg-teal-500 hover:text-white hover:border-teal-500 transition-all duration-200'
                        )}
                      >
                        <Download className="w-4 h-4" />
                        {isRTL ? 'تصدير نسخة احتياطية' : 'Export Backup'}
                      </button>
                      <div className="flex-1 relative">
                        <input type="file" id="backup-upload" accept=".json" className="hidden" onChange={handleImportBackup} disabled={isPending} />
                        <button
                          onClick={() => document.getElementById('backup-upload')?.click()}
                          disabled={isPending}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-border/40 bg-card/30 text-muted-foreground text-sm font-bold',
                            'hover:bg-card/60 hover:text-foreground hover:border-border/70 transition-all duration-200 disabled:opacity-50'
                          )}
                        >
                          <Upload className="w-4 h-4" />
                          {isRTL ? 'استعادة نسخة' : 'Restore Backup'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cleanup Section */}
                  <div className="glass-card rounded-2xl p-6 border border-border/30">
                    <SectionHeader
                      icon={CalendarDays}
                      title={isRTL ? 'تنظيف البيانات' : 'Data Cleanup'}
                      subtitle={isRTL ? 'إزالة البيانات القديمة لتحسين الأداء' : 'Remove old records to optimize performance'}
                      color="amber"
                    />
                    <div className="space-y-3">
                      <DangerCard
                        icon={CalendarOff}
                        title={isRTL ? 'تنظيف ذكي — أكثر من ٣ شهور' : 'Smart Cleanup — Older than 3 Months'}
                        description={isRTL
                          ? 'مسح الجلسات والمبيعات والمعاملات الأقدم من ٩٠ يوماً لتخفيف الحمل على قاعدة البيانات.'
                          : 'Permanently delete sessions, sales, and transactions older than 90 days to reduce database load.'}
                        btnLabel={isRTL ? 'بدء التنظيف الذكي' : 'Run Smart Cleanup'}
                        color="amber"
                        onClick={() => setConfirmModal('CLEAR_OLD')}
                        isRTL={isRTL}
                      />
                      <DangerCard
                        icon={Trash2}
                        title={isRTL ? 'مسح سجل الفواتير' : 'Clear Billing History'}
                        description={isRTL
                          ? 'مسح جميع سجلات الجلسات والطلبات. سيؤدي هذا إلى تصفير كامل تقارير الإيرادات.'
                          : 'Wipe all session history and order logs, resetting your revenue reports to zero.'}
                        btnLabel={isRTL ? 'مسح كل الفواتير' : 'Wipe All Billing'}
                        color="blue"
                        onClick={() => setConfirmModal('CLEAR')}
                        isRTL={isRTL}
                      />
                    </div>
                  </div>

                  {/* Factory Reset */}
                  <div className="glass-card rounded-2xl p-6 border border-red-500/15 bg-red-500/4">
                    <SectionHeader
                      icon={ShieldAlert}
                      title={isRTL ? 'منطقة الخطر — إعادة ضبط المصنع' : 'Danger Zone — Factory Reset'}
                      subtitle={isRTL ? 'يحذف كل شيء بشكل نهائي' : 'Permanently erases everything'}
                      color="red"
                    />
                    <DangerCard
                      icon={RefreshCcw}
                      title={isRTL ? 'إعادة ضبط المصنع الكامل' : 'Full Factory Reset'}
                      description={isRTL
                        ? 'حذف جميع الأجهزة وعناصر الكافيتريا والموظفين والفواتير والإيرادات. يستثني حسابك الحالي فقط.'
                        : 'Delete all devices, cafeteria items, staff, billing, and financial records. Only your admin account will remain.'}
                      btnLabel={isRTL ? 'إعادة ضبط المصنع' : 'Factory Reset'}
                      color="red"
                      onClick={() => setConfirmModal('RESET')}
                      isRTL={isRTL}
                    />
                  </div>
                   </div>
                 )}
                 
                 {/* ══════════════════════════════════ */}
                 {/* TAB: GENERAL SETTINGS                   */}
                 {/* ══════════════════════════════════ */}
                  {activeTab === 'general' && !isLoadingSettings && (
                    <TenantSettings />
                  )}
                 {activeTab === 'general' && isLoadingSettings && (
                   <div className="flex items-center justify-center py-8">
                     <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
                   </div>
                 )}
              </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── CONFIRM MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => !isPending && setConfirmModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden"
            >
              {/* colored top bar */}
              <div className={cn(
                'absolute top-0 inset-x-0 h-1 rounded-t-3xl',
                confirmModal === 'RESET' ? 'bg-red-500' : confirmModal === 'CLEAR_OLD' ? 'bg-amber-500' : 'bg-blue-500'
              )} />

              <button
                onClick={() => !isPending && setConfirmModal(null)}
                className={cn("absolute top-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors", 'end-4')}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center pt-2">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border',
                  confirmModal === 'RESET' ? 'bg-red-500/10 border-red-500/20' : confirmModal === 'CLEAR_OLD' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'
                )}>
                  <ShieldAlert className={cn('w-7 h-7', confirmModal === 'RESET' ? 'text-red-400' : confirmModal === 'CLEAR_OLD' ? 'text-amber-400' : 'text-blue-400')} />
                </div>
                <h2 className="text-xl font-black text-foreground mb-2">
                  {isRTL ? 'هل أنت متأكد؟' : 'Are you sure?'}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-7">
                  {confirmModal === 'CLEAR_OLD'
                    ? (isRTL ? 'سيتم مسح جميع الجلسات والمبيعات الأقدم من 3 شهور. لا يمكن التراجع.' : 'All sessions and sales older than 3 months will be permanently deleted.')
                    : confirmModal === 'RESET'
                    ? (isRTL ? 'سيتم مسح كل البيانات بشكل دائم. لا يمكن التراجع عن هذا.' : 'All data will be permanently erased. This cannot be undone.')
                    : (isRTL ? 'سيتم مسح جميع الفواتير وسجل الجلسات نهائياً.' : 'All billing records and session history will be permanently wiped.')}
                </p>

                <div className={cn('flex gap-3 w-full')}>
                  <button
                    disabled={isPending}
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition-all"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleAction(confirmModal)}
                    className={cn(
                      'flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2',
                      confirmModal === 'RESET'
                        ? 'bg-red-500 hover:bg-red-600'
                        : confirmModal === 'CLEAR_OLD'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    )}
                  >
                    {isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isRTL ? 'تأكيد' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BACKUP MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {backupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => !isPending && setBackupModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative bg-card border border-teal-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-teal-500" />
              <button
                onClick={() => !isPending && setBackupModal(false)}
                className={cn("absolute top-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground", 'end-4')}
              >
                <X className="w-4 h-4" />
              </button>

              <div className={cn('flex items-center gap-3 mb-6')}>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Save className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">{isRTL ? 'تصدير نسخة احتياطية' : 'Export Backup'}</h2>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'اختر البيانات التي تريد تضمينها' : 'Select which data to include'}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { id: 'settings',  label: isRTL ? 'الإعدادات والأجهزة (يشمل الموظفين)' : 'Settings & Devices (incl. Staff)' },
                  { id: 'inventory', label: isRTL ? 'المخزون والكافيتريا' : 'Inventory & Cafeteria' },
                  { id: 'reports',   label: isRTL ? 'الجلسات والتقارير' : 'Sessions & Reports' },
                  { id: 'finance',   label: isRTL ? 'المالية والخزينة' : 'Finance & Treasury' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      (backupOptions as any)[opt.id]
                        ? 'border-teal-500/30 bg-teal-500/8'
                        : 'border-border/30 bg-card/20 hover:bg-card/40',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={(backupOptions as any)[opt.id]}
                      onChange={(e) => setBackupOptions((prev) => ({ ...prev, [opt.id]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className={cn('flex gap-3')}>
                <button disabled={isPending} onClick={() => setBackupModal(false)} className="flex-1 py-3 rounded-2xl bg-muted font-bold text-sm transition-all">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  disabled={isPending || !Object.values(backupOptions).some((v) => v)}
                  onClick={handleExportBackup}
                  className="flex-1 py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isRTL ? 'تصدير الآن' : 'Export Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
