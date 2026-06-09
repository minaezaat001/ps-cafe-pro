"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Monitor, Gamepad2, Tv, Laptop, Smartphone, Headset, Cpu } from 'lucide-react';
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
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { getBillBreakdown } from '@/lib/billing';
import { usePrintSettings } from '@/lib/usePrintSettings';
import { printReceiptSilently } from '@/lib/printUtils';
import { useKeyPress } from '@/lib/useKeyPress';

interface DeviceProp {
  id: string;
  number: string;
  type: string;
  hourlyRateSingle: number;
  hourlyRateMulti: number;
}

interface UseDeviceCardProps {
  device: DeviceProp;
  session?: any;
  allDevices?: any[];
  deviceTypes?: any[];
  activeShift?: any;
  onMutationComplete?: () => void | Promise<void>;
  serverTimeOffset?: number;
}

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

export function useDeviceCard({
  device,
  session,
  allDevices: allDevicesProp = [],
  deviceTypes = [],
  activeShift,
  onMutationComplete,
  serverTimeOffset = 0,
}: UseDeviceCardProps) {
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const accent = useMemo(() => {
    const typeObj = deviceTypes?.find((t: any) => t.name === device.type);
    if (typeObj) return getThemeVars(typeObj.color);
    if (device.type === 'PRIVATE') return getThemeVars('amber');
    if (device.type === 'PS4') return getThemeVars('violet');
    return getThemeVars('blue');
  }, [deviceTypes, device.type]);
  const accentHex = accent.hex;

  const deviceIcon = useMemo(() => {
    const typeObj = deviceTypes?.find((t: any) => t.name === device.type);
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
  }, [deviceTypes, device.type]);

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

  const billBreakdown = useMemo(() => {
    if (!session) return { single: 0, multi: 0, items: 0, gaming: 0, subtotal: 0, total: 0, segments: [] as any };
    return getBillBreakdown(session, device, now ?? undefined);
  }, [session, device, now]);

  const calculateTotal = useCallback(() => billBreakdown.total.toFixed(2), [billBreakdown.total]);
  const getTimeCost = useCallback(() => billBreakdown.gaming.toFixed(2), [billBreakdown.gaming]);
  const getBillBreakdownLocal = useCallback(() => billBreakdown, [billBreakdown]);

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
      setShowDetails(false);
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
      setShowCheckoutModal(false);
      const sessionId = session.id;
      await endSession(sessionId, "Session ended");
      if (printSettings.enabled && printChecked) {
        try {
          await printReceiptSilently(sessionId, printSettings);
        } catch {
          window.open(`/print/invoice/${sessionId}?source=device&size=${printSettings.paperSize}`, '_blank');
        }
      }
      await syncDashboard();
      toast.success('Session ended and billed');
    } catch (err) { 
      console.error("[UI ERROR] Failed to end:", err);
      toast.error('Failed to end session'); 
      setShowCheckoutModal(true);
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
    const reason = prompt(isRTL ? "سبب حذف الطلب:" : "Reason for deleting order:");
    if (!reason || reason.trim().length === 0) return;
    try {
      setIsPending(true);
      await removeOrderFromSession(orderId, reason.trim());
      await syncDashboard();
      toast.success(t('device.orderRemoved'));
    } catch { toast.error('Failed to remove order'); }
    finally { setIsPending(false); }
  };

  useEffect(() => {
    if (!session || !session.isActive) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      const currentNow = Date.now() + serverTimeOffset;
      setNow(currentNow);
      const startMs = new Date(session.startTime).getTime();
      if (Number.isNaN(startMs)) return;
      let diff = currentNow - startMs;
      if (diff < 0) diff = 0;
      const totalMs = session.type === 'FIXED' && session.durationMinutes ? session.durationMinutes * 60000 : Infinity;

      if (diff >= totalMs) {
        diff = totalMs;
        if (!showCheckoutModal && session.type === 'FIXED') {
          setShowCheckoutModal(true);
        }
      }

      const duration = intervalToDuration({ start: 0, end: diff });
      const h = String(Math.max(0, duration.hours || 0)).padStart(2, '0');
      const m = String(Math.max(0, duration.minutes || 0)).padStart(2, '0');
      const s = String(Math.max(0, duration.seconds || 0)).padStart(2, '0');
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

  const inputCls = "w-full bg-card border border-border rounded-xl py-3 px-4 outline-none text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 transition-colors";
  const selectCls = `${inputCls} cursor-pointer`;

  const isActive = session?.isActive;
  const currentRate = session?.isMulti ? device.hourlyRateMulti : device.hourlyRateSingle;
  const allDevices = allDevicesProp;

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
    },
  };

  return {
    elapsed,
    remainingLabel,
    showDetails,
    setShowDetails,
    showCheckoutModal,
    setShowCheckoutModal,
    fixedMinutes,
    setFixedMinutes,
    isPending,
    isMultiMode,
    setIsMultiMode,
    showOrderModal,
    setShowOrderModal,
    showTransferMode,
    setShowTransferMode,
    inventory,
    selectedItems,
    setSelectedItems,
    isMounted,
    showAddTimeModal,
    setShowAddTimeModal,
    extraMinutes,
    setExtraMinutes,
    confirmDeleteId,
    setConfirmDeleteId,
    isDragOver,
    setIsDragOver,
    selectedOrderCategory,
    setSelectedOrderCategory,
    lastClickedItemId,
    setLastClickedItemId,
    showQrModal,
    setShowQrModal,
    isLight,
    accent,
    accentHex,
    deviceIcon,
    isActive,
    currentRate,
    t,
    isRTL,
    inputCls,
    selectCls,
    calculateTotal,
    getTimeCost,
    getBillBreakdownLocal,
    handleAddOrder,
    handleStart,
    handleTransfer,
    handleEnd,
    handleToggleMode,
    handleRemoveOrder,
    handleAddTime,
    dndEvents,
    printSettings,
    printChecked,
    setPrintChecked,
    syncDashboard,
    allDevices,
    isPrivate,
    playAlertSound,
  };
}
