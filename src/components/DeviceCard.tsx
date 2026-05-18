"use client";

import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Gamepad2,
  Play,
  Clock,
  Beer,
  Settings,
  ArrowRightLeft,
  Square,
  Coffee,
  X,
  Crown,
  Trash2,
  RefreshCw,
  User,
  Users,
  Timer,
  Zap,
  CircleDot,
  Plus,
  Tv,
  Laptop,
  Smartphone,
  Headset,
  Cpu,
  GlassWater,
  Utensils,
  Pizza,
  Cookie,
  MoreHorizontal,
  QrCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { intervalToDuration } from 'date-fns';
import { toast } from 'sonner';
import {
  startSession,
  endSession,
  addOrderToSession,
  getActiveInventoryForOrders,
  transferSession,
  toggleSessionMode,
  removeOrderFromSession,
  addSessionTime,
} from '@/app/actions';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { calculateSessionTimeCost, calculateActualElapsedCost, getBillBreakdown } from '@/lib/billing';
import { usePrintSettings } from '@/lib/usePrintSettings';
import { printReceiptSilently } from '@/lib/printUtils';
import { useKeyPress } from '@/lib/useKeyPress';
import { DeviceQrModal } from '@/components/DeviceQrModal';


interface DeviceCardProps {
  device: {
    id: string;
    number: string;
    type: string;
    hourlyRateSingle: number;
    hourlyRateMulti: number;
  };
  session?: any;
  allDevices?: any[];
  deviceTypes?: any[];
  isCompact?: boolean;
  activeShift?: any;
  onMutationComplete?: () => void | Promise<void>;
  showQrButton?: boolean;
  menuBaseUrl?: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  session,
  allDevices = [],
  deviceTypes = [],
  isCompact = false,
  activeShift,
  onMutationComplete,
  showQrButton,
  menuBaseUrl,
}) => {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [elapsed, setElapsed] = useState('00:00:00');
  const [remainingLabel, setRemainingLabel] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [fixedMinutes, setFixedMinutes] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTransferMode, setShowTransferMode] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState('');
  
  // New UI Enhancements States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Cafeteria Enhancements States
  const [selectedOrderCategory, setSelectedOrderCategory] = useState<string>('All');
  const [lastClickedItemId, setLastClickedItemId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const syncDashboard = async () => {
    if (onMutationComplete) await onMutationComplete();
    else router.refresh();
  };

  const { settings: printSettings, isLoaded: printLoaded } = usePrintSettings();
  const [printChecked, setPrintChecked] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (printLoaded) setPrintChecked(printSettings.autoPrint);
  }, [printLoaded, printSettings.autoPrint, showCheckoutModal]);

  // ── Global Keyboard Shortcuts ─────────────────────────
  // Escape → close whatever modal is open (priority: checkout > order > transfer > addTime > details)
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (showCheckoutModal && !(session?.type === 'FIXED' && remainingLabel === t('device.timeUp'))) {
      setShowCheckoutModal(false);
    } else if (showOrderModal) {
      setShowOrderModal(false);
    } else if (showTransferMode) {
      setShowTransferMode(false);
    } else if (showAddTimeModal) {
      setShowAddTimeModal(false);
    } else if (showDetails) {
      setShowDetails(false);
    }
  }, isMounted && (showCheckoutModal || showOrderModal || showTransferMode || showAddTimeModal || showDetails));

  // Enter → execute primary action of the active modal
  useKeyPress('Enter', () => {
    if (isPending) return;
    if (showAddTimeModal && extraMinutes) {
      handleAddTime();
    } else if (showCheckoutModal && !showOrderModal && !showAddTimeModal) {
      handleEnd();
    } else if (showOrderModal) {
      const hasItems = Object.values(selectedItems).some(q => q > 0);
      if (hasItems) handleAddOrder();
    }
  }, isMounted && (showCheckoutModal || showOrderModal || showAddTimeModal));

  const isPrivate = device.type === 'PRIVATE';

  // ── Colors ───────────────────────────────────────
  const getThemeVars = (colorName: string) => {
    switch(colorName) {
      case 'amber': return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30 dark:border-amber-500/20', glow: 'shadow-amber-500/20', hex: '#fbbf24', tagBg: 'bg-amber-600 dark:bg-amber-500', tagText: 'text-white dark:text-black font-black' };
      case 'orange': return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30 dark:border-orange-500/20', glow: 'shadow-orange-500/20', hex: '#f97316', tagBg: 'bg-orange-600 dark:bg-orange-500', tagText: 'text-white font-black' };
      case 'rose': return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30 dark:border-rose-500/20', glow: 'shadow-rose-500/20', hex: '#e11d48', tagBg: 'bg-rose-600', tagText: 'text-white' };
      case 'fuchsia': return { text: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30 dark:border-fuchsia-500/20', glow: 'shadow-fuchsia-500/20', hex: '#d946ef', tagBg: 'bg-fuchsia-600', tagText: 'text-white' };
      case 'violet': return { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30 dark:border-violet-500/20', glow: 'shadow-violet-500/20', hex: '#8b5cf6', tagBg: 'bg-violet-600', tagText: 'text-white' };
      case 'blue': return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30 dark:border-blue-500/20', glow: 'shadow-blue-500/20', hex: '#3b82f6', tagBg: 'bg-blue-600', tagText: 'text-white' };
      case 'cyan': return { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30 dark:border-cyan-500/20', glow: 'shadow-cyan-500/20', hex: '#06b6d4', tagBg: 'bg-cyan-600', tagText: 'text-white dark:text-black font-black' };
      case 'emerald': return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30 dark:border-emerald-500/20', glow: 'shadow-emerald-500/20', hex: '#10b981', tagBg: 'bg-emerald-600', tagText: 'text-white font-black' };
      case 'slate': return { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30 dark:border-slate-500/20', glow: 'shadow-slate-500/20', hex: '#64748b', tagBg: 'bg-slate-600', tagText: 'text-white' };
      default: return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30 dark:border-blue-500/20', glow: 'shadow-blue-500/20', hex: '#3b82f6', tagBg: 'bg-blue-600', tagText: 'text-white' };
    }
  };

  const getAccent = () => {
    const typeObj = deviceTypes?.find(t => t.name === device.type);
    if (typeObj) return getThemeVars(typeObj.color);

    // Legacy fallbacks if not mapped
    if (device.type === 'PRIVATE') return getThemeVars('amber');
    if (device.type === 'PS4') return getThemeVars('violet');
    return getThemeVars('blue');
  };
  const accent = getAccent();
  const accentHex = accent.hex;

  const getDeviceIcon = () => {
    const typeObj = deviceTypes?.find(t => t.name === device.type);
    const iconName = typeObj?.icon || (device.type === 'PRIVATE' ? 'Monitor' : 'Gamepad2');
    
    const iconMap: Record<string, React.ReactNode> = {
      Monitor: <Monitor className="w-5 h-5" />,
      Gamepad2: <Gamepad2 className="w-5 h-5" />,
      Tv: <Tv className="w-5 h-5" />,
      Laptop: <Laptop className="w-5 h-5" />,
      Smartphone: <Smartphone className="w-5 h-5" />,
      Headset: <Headset className="w-5 h-5" />,
      Cpu: <Cpu className="w-5 h-5" />,
    };

    return iconMap[iconName] || <Gamepad2 className="w-5 h-5" />;
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) { console.error('Audio failed', e); }
  };

  const calculateTotal = () => {
    if (!session) return '0.00';
    const breakdown = getBillBreakdown(session, device, now || undefined);
    return (breakdown.total).toFixed(2);
  };


  const getTimeCost = () => {
    if (!session) return '0.00';
    const breakdown = getBillBreakdown(session, device, now || undefined);
    return breakdown.gaming.toFixed(2);
  };


  const getBillBreakdownLocal = () => {
    if (!session) return { single: 0, multi: 0, items: 0, gaming: 0, segments: [] as any };
    return getBillBreakdown(session, device, now || undefined);
  };


  useEffect(() => {
    if (showOrderModal) getActiveInventoryForOrders().then(setInventory);
  }, [showOrderModal]);

  const handleAddOrder = async () => {
    if (!session) return;
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً لإضافة طلبات!" : "Active shift required to add orders!");
      return;
    }
    try {
      setIsPending(true);
      const items = Object.entries(selectedItems).filter(([_, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, quantity: qty }));
      if (items.length === 0) return;
      const res = await addOrderToSession(session.id, items);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await syncDashboard();
      toast.success(isRTL ? "تمت الإضافة للفاتورة" : "Added to bill");
      setShowOrderModal(false);
      setSelectedItems({});
    } finally {
      setIsPending(false);
    }
  };

  const handleStart = async (type: 'OPEN' | 'FIXED') => {
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً لبدء جلسة جديدة!" : "Active shift required to start a session!");
      return;
    }
    try {
      setIsPending(true);
      const minutes = type === 'FIXED' ? parseInt(fixedMinutes) : undefined;
      if (type === 'FIXED' && (!minutes || minutes <= 0)) {
        toast.error('Please enter valid positive minutes');
        setFixedMinutes('');
        return;
      }
      console.log(`[UI] Starting ${type} session for device ${device.number}...`);
      await startSession(device.id, type, minutes, isMultiMode);
      await syncDashboard();
      toast.success(`${isMultiMode ? 'Multi' : 'Single'} session started`);
      setFixedMinutes('');
      setShowDetails(false); // Close any open start menus
    } catch (err) { 
      console.error("[UI ERROR] Failed to start:", err);
      toast.error('Failed to start session'); 
    }
    finally { setIsPending(false); }
  };

  const handleTransfer = async (targetDeviceId: string) => {
    if (!session) return;
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً لنقل الجلسة!" : "Active shift required to transfer session!");
      return;
    }
    try {
      setIsPending(true);
      await transferSession(session.id, targetDeviceId);
      await syncDashboard();
      toast.success('Session transferred successfully');
      setShowTransferMode(false);
    } catch (err) { toast.error('Failed to transfer: ' + (err as Error).message); }
    finally { setIsPending(false); }
  };

  const handleEnd = async () => {
    if (!session) return;
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً لتحصيل الحساب وإغلاق الجلسة!" : "Active shift required to end session and bill!");
      return;
    }
    try {
      setIsPending(true);
      console.log(`[UI] Ending session for device ${device.number}...`);
      setShowCheckoutModal(false); // Close immediately for responsive feel
      
      const sessionId = session.id;
      await endSession(sessionId);

      if (printSettings.enabled && printChecked) {
        try {
          await printReceiptSilently(sessionId, printSettings);
        } catch {
          // Fallback: open in new tab if iframe print fails
          window.open(`/print/invoice/${sessionId}?source=device&size=${printSettings.paperSize}`, '_blank');
        }
      }

      await syncDashboard();
      toast.success('Session ended and billed');
    } catch (err) { 
      console.error("[UI ERROR] Failed to end:", err);
      toast.error('Failed to end session'); 
      setShowCheckoutModal(true); // Re-open on failure
    }
    finally { setIsPending(false); }
  };

  const handleToggleMode = async () => {
    if (!session) return;
    try {
      setIsPending(true);
      console.log(`[UI] Toggling mode for device ${device.number}...`);
      await toggleSessionMode(session.id);
      await syncDashboard();
      toast.success(t('device.modeSwitched'));
    } catch (err) { 
      console.error("[UI ERROR] Failed to toggle:", err);
      toast.error('Failed to switch mode'); 
    }
    finally { setIsPending(false); }
  };

  const handleRemoveOrder = async (orderId: string) => {
    try {
      setIsPending(true);
      await removeOrderFromSession(orderId);
      await syncDashboard();
      toast.success(t('device.orderRemoved'));
    } catch { toast.error('Failed to remove order'); }
    finally { setIsPending(false); }
  };

  useEffect(() => {
    if (!session || !session.isActive) return;
    setNow(Date.now()); // Set initial client-side time
    const interval = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      const start = new Date(session.startTime).getTime();
      let diff = Math.max(0, currentNow - start);
      const totalMs = session.type === 'FIXED' && session.durationMinutes ? session.durationMinutes * 60000 : Infinity;

      if (diff >= totalMs) {
        diff = totalMs;
        if (!showCheckoutModal && session.type === 'FIXED') {
          setShowCheckoutModal(true);
        }
      }

      const duration = intervalToDuration({ start: 0, end: diff });
      const h = String(duration.hours || 0).padStart(2, '0');
      const m = String(duration.minutes || 0).padStart(2, '0');
      const s = String(duration.seconds || 0).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);

      if (session.type === 'FIXED' && session.durationMinutes) {
        const remainingMs = totalMs - diff;
        if (remainingMs > 0) {
          const rd = intervalToDuration({ start: 0, end: remainingMs });
          const rm = String(rd.minutes || 0).padStart(2, '0');
          const rs = String(rd.seconds || 0).padStart(2, '0');
          setRemainingLabel(`-${rm}:${rs}`);
        } else {
          setRemainingLabel(t('device.timeUp'));
        }
        if (Math.abs(remainingMs - 60000) < 500) {
          toast.warning(`DEVICE #${device.number} - 1 MINUTE LEFT`, { description: 'Session is almost over.', duration: 5000 });
          playAlertSound();
        }
        if (Math.abs(remainingMs - 0) < 500) {
          toast.error(`DEVICE #${device.number} - TIME IS UP!`, { description: 'Session finished.', duration: 0 });
          playAlertSound();
        }
      } else {
        setRemainingLabel(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, showCheckoutModal]);

  // ── Modal button base styles ──────────────────────
  const inputCls = "w-full bg-card border border-border rounded-xl py-3 px-4 outline-none text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 transition-colors";
  const selectCls = `${inputCls} cursor-pointer`;

  const isActive = session?.isActive;
  const currentRate = session?.isMulti ? device.hourlyRateMulti : device.hourlyRateSingle;

  const handleAddTime = async () => {
    if (!extraMinutes || isNaN(parseInt(extraMinutes))) return;
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً لإضافة وقت!" : "Active shift required to add time!");
      return;
    }
    setIsPending(true);
    try {
      await addSessionTime(session.id, parseInt(extraMinutes));
      await syncDashboard();
      toast.success(t('device.modeSwitched'));
      setShowAddTimeModal(false);
      setExtraMinutes('');
    } catch (err: any) {
      toast.error(err.message || "Failed to add time");
    } finally {
      setIsPending(false);
    }
  };

  const renderModals = () => {
    if (!isMounted) return null;
    return createPortal(
      <>
      <AnimatePresence>
        {/* ── Checkout Modal ─────────────────────────── */}
        {showCheckoutModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => {
                if (!(session?.type === 'FIXED' && remainingLabel === t('device.timeUp')) && !isPending) {
                  setShowCheckoutModal(false);
                }
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-md p-6 sm:p-8 rounded-2xl relative z-[10000] border-t-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
              style={{ borderTopColor: accent.hex, boxShadow: `0 20px 50px -12px ${accent.hex}33` }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-6', isRTL && 'flex-row-reverse')}>
                <div className={isRTL ? 'text-right' : ''}>
                  <h2 className="text-xl font-black text-foreground">
                    {t('device.checkoutSettlement')} <span style={{ color: accent.hex }}>#{device.number}</span>
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{t('device.finalizingDevice')}{device.number}</p>
                </div>
                {!(session?.type === 'FIXED' && remainingLabel === t('device.timeUp')) && (
                  <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-muted rounded-xl transition text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className={cn("space-y-4 mb-6", isRTL && "text-right")}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('device.duration')}</p>
                    <p className="text-lg font-black text-foreground font-mono">{elapsed}</p>
                  </div>
                  <div className={cn('p-4 rounded-xl bg-card border border-border', isRTL ? 'text-left' : 'text-right')}>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('device.mode')}</p>
                    <p className={cn("text-lg font-black", accent.text)}>
                      {isMultiMode ? t('device.multi') : t('device.single')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {getBillBreakdownLocal().segments && getBillBreakdownLocal().segments.length > 0 ? (
                    <div className="space-y-2 py-2 border-b border-border">
                      {getBillBreakdownLocal().segments.map((seg: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm items-center">
                          <span className="text-muted-foreground">
                            {t('device.account')} {seg.deviceType} ({seg.mode === 'SINGLE' ? t('device.single') : t('device.multi')})
                          </span>
                          <span className="font-bold text-foreground font-mono">{seg.cost.toFixed(2)} EGP</span>
                        </div>
                      ))}
                    </div>
                  ) : getBillBreakdownLocal().single > 0 || getBillBreakdownLocal().multi > 0 ? (
                    <div className="space-y-2 py-2 border-b border-border">
                      {getBillBreakdownLocal().single > 0 && (
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-muted-foreground">{t('device.singleCost')}</span>
                          <span className="font-bold text-foreground font-mono">{getBillBreakdownLocal().single.toFixed(2)} EGP</span>
                        </div>
                      )}
                      {getBillBreakdownLocal().multi > 0 && (
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-muted-foreground">{t('device.multiCost')}</span>
                          <span className="font-bold text-foreground font-mono">{getBillBreakdownLocal().multi.toFixed(2)} EGP</span>
                        </div>
                      )}
                    </div>
                  ) : null}


                  <div>
                    <span className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest block mb-2">{t('device.orderItems')}</span>
                    {session && (session.orders || []).length > 0 ? (
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {session.orders.map((o: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-base text-foreground/90 group">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => confirmDeleteId === o.id ? handleRemoveOrder(o.id) : setConfirmDeleteId(o.id)} 
                                onMouseLeave={() => setConfirmDeleteId(null)} 
                                className={cn(
                                  "p-1 rounded transition-all",
                                  confirmDeleteId === o.id 
                                    ? "opacity-100 text-red-500 bg-red-500/20 px-2 text-[10px] font-bold" 
                                    : "opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10"
                                )}
                              >
                                {confirmDeleteId === o.id ? (isRTL ? "تأكيد؟" : "Confirm?") : <Trash2 className="w-3 h-3" />}
                              </button>
                              <span>{o.inventoryItem?.name} x{o.quantity}</span>
                            </div>
                            <span className="font-bold text-foreground font-mono">{(o.priceAtTime * o.quantity).toFixed(2)} EGP</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-muted-foreground/80 italic">{t('device.noCafeteriaItems')}</p>
                    )}
                  </div>
                </div>

                <div className={cn("pt-4 border-t-2 border-dashed border-border", isRTL ? "text-right" : "text-left")}>
                  <p className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('device.totalToCollect')}</p>
                  <div className={cn("text-4xl font-black tracking-tighter", accent.text, isRTL ? "flex flex-row-reverse justify-start" : "flex justify-start")}>
                    <span className="text-base mt-auto mb-1 mx-1 text-muted-foreground">EGP</span>
                    {calculateTotal()}
                  </div>
                </div>
              </div>

              {printSettings.enabled && (
                <div className={cn("mb-4 flex items-center gap-3", isRTL && "flex-row-reverse")}>
                   <input type="checkbox" id="print-invoice-cb" checked={printChecked} onChange={(e) => setPrintChecked(e.target.checked)} className="w-5 h-5 rounded border-border text-blue-500 focus:ring-blue-500 cursor-pointer" />
                   <label htmlFor="print-invoice-cb" className="font-bold text-sm text-foreground cursor-pointer select-none">
                     {isRTL ? "طباعة الفاتورة" : "Print Invoice"}
                   </label>
                </div>
              )}

              <div className={cn("grid gap-3", (session?.type === 'FIXED' && remainingLabel === t('device.timeUp')) ? "grid-cols-1" : "grid-cols-2")}>
                {!(session?.type === 'FIXED' && remainingLabel === t('device.timeUp')) && (
                  <button onClick={() => setShowCheckoutModal(false)}
                    className="py-3 rounded-xl border border-border text-foreground font-bold hover:bg-muted transition-all">
                    {t('device.back')}
                  </button>
                )}
                <button disabled={isPending} onClick={handleEnd}
                  className="py-3 rounded-xl text-white font-black tracking-wide shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  {isPending ? t('device.finishing') : (session?.type === 'FIXED' && remainingLabel === t('device.timeUp')) ? t('common.close') : t('device.collectEnd')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Bill Summary Modal ──────────────────────── */}
        {showDetails && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-[10000] border-t-4"
              style={{ borderTopColor: accent.hex, boxShadow: `0 20px 50px -12px ${accent.hex}33` }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-6', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                <h2 className="text-xl font-black text-foreground">{t('device.billSummary')}</h2>
                <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn("max-h-[60vh] overflow-y-auto", isRTL && "text-right")}>
                <div className="flex justify-between text-base pb-3 border-b border-border">
                  <span className="text-muted-foreground text-sm font-bold uppercase">{t('device.station')}</span>
                  <span className="font-black" style={{ color: accent.hex }}>#{device.number} ({device.type})</span>
                </div>
                <div className="flex justify-between text-base pb-3 border-b border-border">
                  <span className="text-muted-foreground text-sm font-bold uppercase">{t('device.startedAt')}</span>
                  <span className="font-bold text-foreground font-mono">{new Date(session.startTime).toLocaleTimeString()}</span>
                </div>

                {/* ── Breakdowns for Time/Gaming ── */}
                <div className="py-3 border-b border-border">
                  {getBillBreakdownLocal().segments && getBillBreakdownLocal().segments.length > 0 ? (
                    <div className="space-y-2">
                      {getBillBreakdownLocal().segments.map((seg: any, idx: number) => (
                        <div key={idx} className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                          <span className="text-muted-foreground font-bold uppercase">
                            {t('device.account')} {seg.deviceType} ({seg.mode === 'SINGLE' ? t('device.single') : t('device.multi')})
                          </span>
                          <span className="font-bold text-foreground font-mono">{seg.cost.toFixed(2)} EGP</span>
                        </div>
                      ))}
                    </div>
                  ) : getBillBreakdownLocal().single > 0 || getBillBreakdownLocal().multi > 0 ? (
                    <div className="space-y-2">
                      {getBillBreakdownLocal().single > 0 && (
                        <div className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                          <span className="text-muted-foreground font-bold uppercase">
                            {t('device.account')} {device.type} ({t('device.single')})
                          </span>
                          <span className="font-bold text-foreground font-mono">{getBillBreakdownLocal().single.toFixed(2)} EGP</span>
                        </div>
                      )}
                      {getBillBreakdownLocal().multi > 0 && (
                        <div className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                          <span className="text-muted-foreground font-bold uppercase">
                            {t('device.account')} {device.type} ({t('device.multi')})
                          </span>
                          <span className="font-bold text-foreground font-mono">{getBillBreakdownLocal().multi.toFixed(2)} EGP</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div>
                  <span className="text-muted-foreground text-sm font-bold uppercase block mb-2">{t('device.consumables')}</span>
                  {session && session.orders?.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {session.orders.map((o: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-base group">
                          <div className="flex items-center gap-2 items-center">
                            <button 
                              onClick={() => confirmDeleteId === o.id ? handleRemoveOrder(o.id) : setConfirmDeleteId(o.id)} 
                              onMouseLeave={() => setConfirmDeleteId(null)} 
                              className={cn(
                                "p-1 rounded transition-all",
                                confirmDeleteId === o.id 
                                  ? "opacity-100 text-red-500 bg-red-500/20 px-2 text-[10px] font-bold" 
                                  : "opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10"
                              )}
                            >
                              {confirmDeleteId === o.id ? (isRTL ? "تأكيد؟" : "Confirm?") : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-foreground/90">{o.inventoryItem?.name || 'Item'} x{o.quantity}</span>
                          </div>
                          <span className="font-bold text-foreground font-mono">{(o.priceAtTime * o.quantity).toFixed(2)} EGP</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base text-muted-foreground/80 italic">{t('device.noItemsOrdered')}</p>
                  )}
                </div>
              </div>

              <div className={cn("pt-4 border-t-2 border-dashed border-border mb-2 mt-4", isRTL ? "text-right" : "text-left")}>
                <p className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('device.grandTotal')}</p>
                <div className={cn("text-3xl font-black tracking-tighter text-foreground items-center", isRTL ? "flex flex-row-reverse justify-end" : "flex justify-start")}>
                  <span className="text-base mx-1 mt-auto mb-1" style={{ color: accent.hex }}>EGP</span>
                  {calculateTotal()}
                </div>
              </div>

              <button onClick={() => setShowDetails(false)}
                className="w-full py-3 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted transition-all mt-4">
                {t('device.closeView')}
              </button>
            </motion.div>
          </div>
        )}

        {/* ── Order Modal ─────────────────────────────── */}
        {showOrderModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-md p-6 sm:p-7 rounded-3xl relative z-[10000] border-t-[5px] overflow-hidden flex flex-col"
              style={{ borderTopColor: '#f59e0b', boxShadow: isLight ? '0 10px 40px -10px rgba(245,158,11,0.2)' : '0 20px 50px -12px rgba(245, 158, 11, 0.2)' }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Premium Header */}
              <div className={cn('flex justify-between items-center mb-6', isRTL && 'flex-row-reverse')}>
                <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #f59e0b20, #f9731610)',
                    border: '1px solid #f59e0b30'
                  }}>
                    <Coffee className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground leading-tight">{t('nav.cafeteria')}</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{isRTL ? 'إضافة عناصر للفاتورة' : 'Add items to bill'}</p>
                  </div>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors" style={{
                  background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)'
                }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2 -mx-2 px-2">
                {['All', ...Array.from(new Set((inventory || []).filter(i => i.category).map(i => i.category)))].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedOrderCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-2xl text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                      selectedOrderCategory === cat
                        ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                        : "bg-card border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
                    )}
                  >
                    {cat === 'All' ? (isRTL ? 'الكل' : 'All') : cat}
                  </button>
                ))}
              </div>

              {/* Items Grid (POS Style) */}
              <div className="max-h-[50vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6 pr-1.5 scrollbar-hide content-start pt-1">
                {(inventory || [])
                  .filter(item => selectedOrderCategory === 'All' || item.category === selectedOrderCategory)
                  .map((item) => {
                    const qty = selectedItems[item.id] || 0;
                    const isSelected = qty > 0;
                    const isFlashing = lastClickedItemId === item.id;

                    const getItemIconLocal = (category: string) => {
                      const cat = category?.toLowerCase() || '';
                      if (cat.includes('drink') || cat.includes('مشروب')) return <GlassWater className="w-5 h-5" />;
                      if (cat.includes('food') || cat.includes('أكل') || cat.includes('مأكولات')) return <Utensils className="w-5 h-5" />;
                      if (cat.includes('snack') || cat.includes('سناكس') || cat.includes('مقرمشات')) return <Cookie className="w-5 h-5" />;
                      if (cat.includes('pizza') || cat.includes('بيتزا')) return <Pizza className="w-5 h-5" />;
                      return <MoreHorizontal className="w-5 h-5" />;
                    };

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, qty + 1) }));
                          setLastClickedItemId(item.id);
                          setTimeout(() => setLastClickedItemId(null), 400);
                        }}
                        className={cn(
                          "relative flex flex-col p-3.5 rounded-[20px] transition-all duration-300 cursor-pointer active:scale-[0.97] overflow-hidden group",
                          isSelected 
                            ? (isLight ? "bg-amber-500/10 border border-amber-500/50 shadow-md" : "bg-amber-500/10 border border-amber-500/50")
                            : "bg-card border border-border hover:border-amber-500/30 hover:bg-card/50 shadow-sm",
                          isFlashing && "animate-flash-amber"
                        )}
                      >
                        {/* Top Section: Avatar & Stock/Price */}
                        <div className={cn("flex justify-between items-start mb-3", isRTL && "flex-row-reverse")}>
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-black shrink-0 transition-colors uppercase shadow-sm",
                            isSelected
                              ? "bg-amber-500 text-white shadow-amber-500/20"
                              : (isLight ? "bg-slate-100 text-slate-400" : "bg-white/5 text-white/40")
                          )}>
                            {getItemIconLocal(item.category)}
                          </div>
                          <div className={cn("flex flex-col", isRTL ? 'items-start' : 'items-end')}>
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded text-white tracking-widest uppercase mb-1",
                              item.stock > 10 ? "bg-emerald-500/80" : "bg-rose-500/80"
                            )}>
                              {item.stock} left
                            </span>
                            <span className="font-mono text-[13px] font-black text-foreground leading-none">
                              {item.price}<span className="text-[9px] text-muted-foreground ml-0.5" style={{ marginInlineStart: '2px' }}>EGP</span>
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className={cn("mb-4 min-h-[36px]", isRTL ? 'text-right' : 'text-left')}>
                          <h4 className={cn("font-bold text-sm leading-tight line-clamp-2 transition-colors", isSelected ? "text-amber-500 dark:text-amber-400" : "text-foreground")}>
                            {item.name}
                          </h4>
                        </div>

                        {/* Stepper */}
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="mt-auto flex items-center justify-between p-1 rounded-xl shrink-0" 
                          style={{
                            background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
                            border: isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)'
                          }}
                        >
                          <button onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg transition-all",
                              qty > 0 
                                ? "bg-background text-foreground shadow-sm hover:text-rose-500 hover:bg-rose-500/10" 
                                : "opacity-30 cursor-not-allowed text-muted-foreground"
                            )}>
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={item.stock}
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === '-') {
                                setSelectedItems(prev => ({ ...prev, [item.id]: 0 }));
                                return;
                              }
                              const num = parseInt(val);
                              if (!isNaN(num)) {
                                setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, Math.max(0, num)) }));
                              }
                            }}
                            className={cn(
                              "w-10 text-center font-mono font-black text-[15px] bg-transparent border-none outline-none transition-colors",
                              qty > 0 ? "text-amber-500" : "text-foreground"
                            )}
                            style={{ MozAppearance: 'textfield' } as any}
                          />
                          <button onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, qty + 1) }))}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg transition-all",
                              qty < item.stock 
                                ? "bg-background text-foreground shadow-sm hover:text-emerald-500 hover:bg-emerald-500/10" 
                                : "opacity-30 cursor-not-allowed text-muted-foreground"
                            )}>
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Total & Action */}
              <div className="pt-5 border-t border-dashed border-border mt-auto">
                {(() => {
                  const orderTotal = inventory.reduce((sum, item) => sum + (item.price * (selectedItems[item.id] || 0)), 0);
                  const totalItems = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
                  return (
                    <div className="space-y-4">
                      {orderTotal > 0 && (
                        <div className={cn("flex justify-between items-end px-1", isRTL && "flex-row-reverse")}>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('device.grandTotal') || 'Total'}</p>
                            <p className="text-sm font-bold text-foreground">{totalItems} {isRTL ? 'عناصر' : 'Items'}</p>
                          </div>
                          <div className={cn("flex items-end gap-1.5", isRTL && "flex-row-reverse")}>
                            <span className="text-2xl sm:text-3xl font-black text-amber-500 leading-none">{orderTotal}</span>
                            <span className="text-xs font-bold text-muted-foreground pb-1">EGP</span>
                          </div>
                        </div>
                      )}
                      
                      <button disabled={isPending || orderTotal === 0} onClick={handleAddOrder}
                        className="group relative w-full overflow-hidden rounded-2xl p-[2px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:opacity-50"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 px-8 font-black text-white shadow-lg">
                          {isPending ? t('device.adding') : (
                            <>
                              <Coffee className="w-5 h-5" />
                              <span>{t('device.addToSessionBill')}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Transfer Modal ──────────────────────────── */}
        {showTransferMode && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setShowTransferMode(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-[10000] border-t-4"
              style={{ borderTopColor: '#818cf8', boxShadow: '0 20px 50px -12px rgba(129, 140, 248, 0.2)' }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-5', isRTL && 'flex-row-reverse')}>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-violet-400" /> {t('device.transferStation')}
                </h2>
                <button onClick={() => setShowTransferMode(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
                {allDevices.filter(d => d.id !== device.id && d.sessions.length === 0).map(d => (
                  <button key={d.id} onClick={() => handleTransfer(d.id)}
                    className="w-full p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all flex justify-between items-center group">
                    <span className="font-bold text-base text-foreground">Station #{d.number} ({d.type})</span>
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                  </button>
                ))}
                {allDevices.filter(d => d.id !== device.id && d.sessions.length === 0).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8 uppercase tracking-widest">{t('device.noAvailableStations')}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showQrButton && menuBaseUrl ? (
        <DeviceQrModal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          menuUrl={`${menuBaseUrl.replace(/\/$/, "")}/menu/${device.id}`}
          deviceLabel={`#${device.number}`}
          isRTL={isRTL}
        />
      ) : null}
      </>,
      document.body
    );
  };

  const renderAddTimeModal = () => {
    if (!showAddTimeModal) return null;
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} onClick={() => setShowAddTimeModal(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className="relative w-full max-w-sm bg-background border border-border p-6 rounded-2xl shadow-2xl glass-card text-center"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Timer className="text-emerald-400 w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-1">{t('device.addTime')}</h2>
          <p className="text-sm text-muted-foreground mb-6">Device #{device.number}</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2 text-start">
                {t('device.addMinutes')}
              </label>
              <input
                type="number"
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(e.target.value)}
                autoFocus
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-lg font-black font-mono focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-muted-foreground/30"
                placeholder="0"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button disabled={isPending} onClick={() => setShowAddTimeModal(false)}
                className="py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground transition-all">
                {t('device.back')}
              </button>
              <button disabled={isPending || !extraMinutes} onClick={handleAddTime}
                className="py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('settings.confirm')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  };

  const dndEvents = {
    draggable: !!isActive,
    onDragStart: (e: React.DragEvent) => {
      if (session) e.dataTransfer.setData('sessionId', session.id);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!isActive) setIsDragOver(true);
    },
    onDragLeave: () => setIsDragOver(false),
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const draggedSessionId = e.dataTransfer.getData('sessionId');
      if (draggedSessionId && !isActive && draggedSessionId !== session?.id) {
        try {
          setIsPending(true);
          await transferSession(draggedSessionId, device.id);
          toast.success('Session transferred successfully');
          await syncDashboard();
        } catch (err: any) { toast.error('Failed to transfer: ' + err.message); }
        finally { setIsPending(false); }
      }
    }
  };

  if (isCompact) {
    return (
      <div
        {...dndEvents}
        className={cn(
          "glass-card p-3 pr-4 rounded-xl flex items-center justify-between border-l-4 transition-all cursor-pointer hover:bg-muted/50",
          isActive ? "animate-pulse-glow" : "opacity-80",
          isDragOver ? "ring-2 ring-violet-500 scale-[1.02] bg-violet-500/10" : ""
        )}
        style={{ borderLeftColor: isActive ? accent.hex : '#64748b' }}
        onClick={() => { if (isActive) setShowDetails(true); }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="w-10 h-10 rounded text-muted-foreground flex items-center justify-center bg-background">{getDeviceIcon()}</div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h3 className="font-black text-sm text-foreground">#{device.number}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{device.type}</p>
          </div>
          {showQrButton && menuBaseUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQrModal(true);
              }}
              title={isRTL ? "منيو العميل (QR)" : "Customer menu QR"}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-violet-500 transition-colors shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isActive ? (
          <>
            <div className="flex flex-col items-center">
              <p className="font-mono font-bold text-sm text-foreground tracking-tighter">{elapsed}</p>
              <div className="flex gap-1 mt-1">
                <button onClick={(e) => { e.stopPropagation(); setShowOrderModal(true); }} className="p-1 hover:bg-amber-500/20 text-amber-500 rounded transition-colors"><Coffee className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setShowCheckoutModal(true); }} className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"><Square className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className={isRTL ? 'text-left' : 'text-right'}>
              <span className={cn("text-[10px] text-muted-foreground flex items-center gap-1 font-bold", isRTL ? 'justify-start flex-row-reverse' : 'justify-end')}>
                {session.isMulti ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {session.isMulti ? t('device.multi') : t('device.single')}
              </span>
              <p className="font-black text-base text-foreground mt-0.5">{calculateTotal()} <span className="text-[9px] text-muted-foreground">EGP</span></p>
            </div>
          </>
        ) : (
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted/50 border border-border">{t('device.available')}</span>
            <button disabled={isPending} onClick={(e) => { e.stopPropagation(); handleStart('OPEN'); }} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Play className="w-4 h-4 translate-x-0.5" /></button>
          </div>
        )}
        {renderModals()}
      </div>
    );
  }

  return (
    <motion.div
      {...dndEvents as any}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300',
        isActive ? 'ring-1 animate-pulse-glow' : '',
        isDragOver ? "ring-2 ring-violet-500 scale-[1.02] bg-violet-500/10" : ""
      )}
      style={{
        background: isActive 
          ? (isLight 
              ? `linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))`
              : `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.85))`)
          : 'var(--bg-card)',
        borderTop: `3px solid ${isActive ? accent.hex : 'transparent'}`,
        boxShadow: isActive 
          ? (isLight
              ? `0 0 20px -5px ${accent.hex}20, 0 8px 30px -10px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)`
              : `0 0 30px -5px ${accent.hex}25, 0 10px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`)
          : (isLight 
              ? '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px -4px rgba(0,0,0,0.08)'
              : '0 4px 20px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'),
        ...(isActive ? { ringColor: accent.hex + '40' } : {})
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Card Header ─────────────────────────────── */}
      <div className="p-5 pb-0">
        <div className={cn('flex items-center justify-between mb-4', isRTL && 'flex-row-reverse')}>
          {/* Device Info */}
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${accent.hex}20, ${accent.hex}10)`,
                border: `1px solid ${accent.hex}30`,
                color: accent.hex
              }}
            >
              {getDeviceIcon()}
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <h3 className="text-lg font-black text-foreground leading-tight">#{device.number}</h3>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {device.type === 'PRIVATE' ? t('inventory.private') : device.type}
              </p>
            </div>
          </div>

          <div className={cn("flex items-center gap-2 shrink-0", isRTL && "flex-row-reverse")}>
            {showQrButton && menuBaseUrl && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                title={isRTL ? "منيو العميل (QR)" : "Customer menu QR"}
                className="p-2 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-violet-500 hover:border-violet-500/30 transition-colors"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
            {/* Status Badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 dark:border-slate-500/15'
            )}>
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              {isActive ? t('device.inSession') : t('device.available')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Body ───────────────────────────────── */}
      {isActive ? (
        <div className="px-5 pb-5 space-y-3">
          {/* ── Timer Section ── */}
          <div 
            className="relative text-center py-4 rounded-xl"
            style={{ 
              background: isLight ? `${accent.hex}08` : `linear-gradient(135deg, ${accent.hex}08, transparent)`,
              border: `1px solid ${isLight ? accent.hex + '20' : accent.hex + '15'}`
            }}
          >
            <div className="font-mono text-4xl font-black tracking-tighter text-foreground">
              {elapsed}
            </div>
            <div className={cn('flex items-center justify-center gap-3 mt-1.5', isRTL && 'flex-row-reverse')}>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {currentRate} EGP/{t('reports.hrs') || 'hr'}
              </span>
              {remainingLabel && (
                <span className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-md',
                  remainingLabel === t('device.timeUp')
                    ? 'bg-red-500/15 text-red-400 animate-pulse'
                    : 'bg-blue-500/10 text-blue-400'
                )}>
                  {remainingLabel}
                </span>
              )}
            </div>
          </div>

          {/* ── Mode Toggle ── */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              disabled={isPending || !session.isMulti}
              onClick={handleToggleMode}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 overflow-hidden",
                !session.isMulti 
                  ? "text-white shadow-lg" 
                  : "text-muted-foreground/60 hover:text-muted-foreground border border-border"
              )}
              style={!session.isMulti ? {
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              } : {
                background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {!session.isMulti && <motion.div layoutId="activeToggleGlow" className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10" />}
              <User className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t('device.single')}</span>
            </button>
            <button 
              disabled={isPending || session.isMulti}
              onClick={handleToggleMode}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 overflow-hidden",
                session.isMulti 
                  ? "text-white shadow-lg" 
                  : "text-muted-foreground/60 hover:text-muted-foreground border border-border"
              )}
              style={session.isMulti ? {
                background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
                boxShadow: '0 4px 20px rgba(147, 51, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              } : {
                background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {session.isMulti && <motion.div layoutId="activeToggleGlow" className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10" />}
              <Users className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t('device.multi')}</span>
            </button>
          </div>

          {/* ── Action Buttons ── */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowOrderModal(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold group transition-all duration-200"
              style={{ 
                background: 'rgba(245,158,11,0.08)', 
                border: '1px solid rgba(245,158,11,0.2)',
                color: isLight ? '#b45309' : '#fbbf24'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(245,158,11,0.9)';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(245,158,11,0.08)';
                e.currentTarget.style.color = isLight ? '#b45309' : '#fbbf24';
              }}
            >
              <Coffee className="w-4 h-4 transition-transform group-hover:scale-110" /> {t('device.cafeteria')}
            </button>
            <button onClick={() => setShowTransferMode(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold group transition-all duration-200"
              style={{ 
                background: 'rgba(139,92,246,0.08)', 
                border: '1px solid rgba(139,92,246,0.2)',
                color: isLight ? '#6d28d9' : '#a78bfa'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.9)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                e.currentTarget.style.color = isLight ? '#6d28d9' : '#a78bfa';
              }}
            >
              <ArrowRightLeft className="w-4 h-4 transition-transform group-hover:rotate-90" /> {t('device.transfer')}
            </button>
            {session?.type === 'FIXED' && (
              <button onClick={() => setShowAddTimeModal(true)}
                className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold group transition-all duration-200"
                style={{ 
                  background: 'rgba(16,185,129,0.08)', 
                  border: '1px solid rgba(16,185,129,0.2)',
                  color: isLight ? '#047857' : '#10b981'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(16,185,129,0.9)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(16,185,129,0.08)';
                  e.currentTarget.style.color = isLight ? '#047857' : '#10b981';
                }}
              >
                <Plus className="w-4 h-4 transition-transform group-hover:scale-125" /> {t('device.addTime')}
              </button>
            )}
          </div>

          {/* ── Bill Bar ── */}
          <div 
            className="flex justify-between items-center py-3 px-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
            onClick={() => setShowDetails(true)}
            style={{
              background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
              border: isLight ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{t('device.currentBill')}</span>
            <span className="text-xl font-black font-mono" style={{ color: accent.hex }}>{calculateTotal()} <span className="text-[11px] font-bold text-muted-foreground">EGP</span></span>
          </div>

          {/* ── End Session ── */}
          <button disabled={isPending} onClick={() => setShowCheckoutModal(true)}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 group disabled:opacity-50 transition-all duration-200"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: isLight ? '#b91c1c' : '#f87171'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.color = isLight ? '#b91c1c' : '#f87171';
            }}
          >
            <Square className="w-4 h-4" /> {t('device.finishBill')}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3 pt-1">
          {/* ── Rate Display ── */}
          <div className={cn('flex items-center gap-4 py-2', isRTL && 'flex-row-reverse justify-end')}>
            <div className={cn('flex items-center gap-1.5 text-[11px]', isRTL && 'flex-row-reverse')}>
              <User className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span className="text-muted-foreground font-semibold">{t('device.single')}:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{device.hourlyRateSingle} EGP</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className={cn('flex items-center gap-1.5 text-[11px]', isRTL && 'flex-row-reverse')}>
              <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground font-semibold">{t('device.multi')}:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{device.hourlyRateMulti} EGP</span>
            </div>
          </div>

          {/* ── Mode Toggle (Pre-session) ── */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsMultiMode(false)}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 overflow-hidden",
                !isMultiMode 
                  ? "text-white shadow-lg" 
                  : "text-muted-foreground/60 hover:text-muted-foreground border border-border"
              )}
              style={!isMultiMode ? {
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              } : {
                background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {!isMultiMode && <motion.div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10" />}
              <User className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t('device.single')}</span>
            </button>
            <button 
              onClick={() => setIsMultiMode(true)}
              className={cn(
                "relative flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 overflow-hidden",
                isMultiMode 
                  ? "text-white shadow-lg" 
                  : "text-muted-foreground/60 hover:text-muted-foreground border border-border"
              )}
              style={isMultiMode ? {
                background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
                boxShadow: '0 4px 20px rgba(147, 51, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              } : {
                background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {isMultiMode && <motion.div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10" />}
              <Users className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t('device.multi')}</span>
            </button>
          </div>

          {/* ── Fixed Time Input ── */}
          <div className="flex gap-2">
            <div 
              className="flex-1 rounded-xl flex items-center px-3 transition-all focus-within:ring-1 focus-within:ring-blue-500/30"
              style={{ 
                background: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(15,23,42,0.5)',
                border: isLight ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <Timer className="w-4 h-4 text-muted-foreground/60 shrink-0" style={{ marginInlineEnd: '8px' }} />
              <input
                type="number"
                placeholder={t('device.minutes')}
                value={fixedMinutes}
                onChange={(e) => setFixedMinutes(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 py-2.5"
              />
            </div>
            <button disabled={isPending} onClick={() => handleStart('FIXED')}
              className="px-4 rounded-xl font-bold transition-all disabled:opacity-50 group flex items-center gap-1"
              style={{
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: isLight ? '#6d28d9' : '#a78bfa'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.9)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                e.currentTarget.style.color = isLight ? '#6d28d9' : '#a78bfa';
              }}
            >
              <Play className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          </div>
          
          {/* ── Start Open Session ── */}
          <button disabled={isPending} onClick={() => handleStart('OPEN')}
            className="w-full py-3 rounded-xl font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 text-white group overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${accent.hex}, ${accent.hex}cc)` }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${accent.hex}dd, ${accent.hex})` }} />
            <Play className="w-4 h-4 transition-transform group-hover:translate-x-0.5 relative z-10" />
            <span className="relative z-10">{isPending ? t('device.starting') : t('device.startOpen')}</span>
          </button>
        </div>
      )}

      {renderModals()}
      {renderAddTimeModal()}
    </motion.div>
  );
};
