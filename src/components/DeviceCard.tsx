"use client";

import React from 'react';
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
  QrCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import ActionButton from "@/components/ui/ActionButton";
import { DeviceQrModal } from '@/components/DeviceQrModal';
import CheckoutModal from '@/components/CheckoutModal';
import CafeteriaOrderModal from '@/components/CafeteriaOrderModal';
import BillSummaryModal from '@/components/BillSummaryModal';
import TransferModal from '@/components/TransferModal';
import AddTimeModal from '@/components/AddTimeModal';
import { useDeviceCard } from '@/hooks/useDeviceCard';

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
  showQrButton?: boolean;
  menuBaseUrl?: string;
  serverTimeOffset?: number;
  onMutationComplete?: () => void | Promise<void>;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  session,
  allDevices,
  deviceTypes,
  isCompact = false,
  activeShift,
  onMutationComplete,
  showQrButton,
  menuBaseUrl,
  serverTimeOffset = 0,
}) => {
  const {
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
    allDevices: hookAllDevices,
  } = useDeviceCard({ device, session, allDevices, deviceTypes, activeShift, onMutationComplete, serverTimeOffset });

  const renderModals = () => {
    if (!isMounted) return null;
    return createPortal(
      <>
      <AnimatePresence>
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          session={session}
          device={device}
          t={t}
          isRTL={isRTL}
          accent={accent}
          elapsed={elapsed}
          remainingLabel={remainingLabel}
          isPending={isPending}
          total={calculateTotal()}
          billBreakdown={getBillBreakdownLocal()}
          onEnd={handleEnd}
          onRemoveOrder={handleRemoveOrder}
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId}
          printSettings={printSettings}
          printChecked={printChecked}
          setPrintChecked={setPrintChecked}
        />

        <BillSummaryModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          session={session}
          device={device}
          t={t}
          isRTL={isRTL}
          accent={accent}
          billBreakdown={getBillBreakdownLocal()}
          total={calculateTotal()}
          onRemoveOrder={handleRemoveOrder}
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId}
        />

        <CafeteriaOrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          onAddOrder={handleAddOrder}
          session={session}
          inventory={inventory}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          selectedOrderCategory={selectedOrderCategory}
          setSelectedOrderCategory={setSelectedOrderCategory}
          lastClickedItemId={lastClickedItemId}
          setLastClickedItemId={setLastClickedItemId}
          isPending={isPending}
          isLight={isLight}
          t={t}
          isRTL={isRTL}
        />

        <TransferModal
          isOpen={showTransferMode}
          onClose={() => setShowTransferMode(false)}
          onTransfer={handleTransfer}
          allDevices={hookAllDevices}
          currentDeviceId={device.id}
          t={t}
          isRTL={isRTL}
        />
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

  if (isCompact) {
    return (
      <div
        {...dndEvents}
        className={cn(
          "glass-card p-3 pe-4 rounded-xl flex items-center justify-between border-s-4 transition-all cursor-pointer hover:bg-muted/50",
          isActive ? "animate-pulse-glow" : "opacity-80",
          isDragOver ? "ring-2 ring-violet-500 scale-[1.02] bg-violet-500/10" : ""
        )}
        style={{ borderLeftColor: isActive ? accent.hex : '#64748b' }}
        onClick={() => { if (isActive) setShowDetails(true); }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded text-muted-foreground flex items-center justify-center bg-background">{deviceIcon}</div>
          <div className="text-start">
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
            <div className="text-end">
              <span className={cn("text-[10px] text-muted-foreground flex items-center gap-1 font-bold", isRTL ? 'justify-start flex-row-reverse' : 'justify-end')}>
                {session.isMulti ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {session.isMulti ? t('device.multi') : t('device.single')}
              </span>
              <p className="font-black text-base text-foreground mt-0.5">{calculateTotal()} <span className="text-[9px] text-muted-foreground">EGP</span></p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
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
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${accent.hex}20, ${accent.hex}10)`,
                border: `1px solid ${accent.hex}30`,
                color: accent.hex
              }}
            >
              {deviceIcon}
            </div>
            <div className="text-start">
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <h3 className="text-lg font-black text-foreground leading-tight">#{device.number}</h3>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {device.type === 'PRIVATE' ? t('inventory.private') : device.type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

          <div className="grid grid-cols-2 gap-2">
            <ActionButton variant="warning" onClick={() => setShowOrderModal(true)} icon={<Coffee className="w-4 h-4" />}>
              {t('device.cafeteria')}
            </ActionButton>
            <ActionButton variant="primary" onClick={() => setShowTransferMode(true)} icon={<ArrowRightLeft className="w-4 h-4" />}>
              {t('device.transfer')}
            </ActionButton>
            {session?.type === 'FIXED' && (
              <div className="col-span-2">
                <ActionButton variant="success" onClick={() => setShowAddTimeModal(true)} icon={<Plus className="w-4 h-4" />} fullWidth>
                  {t('device.addTime')}
                </ActionButton>
              </div>
            )}
          </div>

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

          <ActionButton variant="danger" onClick={() => setShowCheckoutModal(true)} disabled={isPending} fullWidth icon={<Square className="w-4 h-4" />}>
            {t('device.finishBill')}
          </ActionButton>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3 pt-1">
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

          <div className="flex flex-col gap-3">
            <div 
              className="w-full rounded-xl flex items-center px-3 transition-all focus-within:ring-1 focus-within:ring-blue-500/30"
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
                className="bg-transparent border-none outline-none w-full text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 py-3"
              />
            </div>
            
            <button disabled={isPending} onClick={() => {
              if (fixedMinutes && parseInt(fixedMinutes) > 0) {
                handleStart('FIXED');
              } else {
                handleStart('OPEN');
              }
            }}
              className="w-full py-3 rounded-xl font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 text-white group overflow-hidden relative"
              style={{ background: `linear-gradient(135deg, ${accent.hex}, ${accent.hex}cc)` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${accent.hex}dd, ${accent.hex})` }} />
              <Play className="w-4 h-4 transition-transform group-hover:translate-x-0.5 relative z-10" />
              <span className="relative z-10">{isPending ? t('device.starting') : (fixedMinutes && parseInt(fixedMinutes) > 0 ? t('device.startFixed') : t('device.startOpen'))}</span>
            </button>
          </div>
        </div>
      )}

      {renderModals()}
      <AddTimeModal
        isOpen={showAddTimeModal}
        onClose={() => setShowAddTimeModal(false)}
        onAddTime={handleAddTime}
        extraMinutes={extraMinutes}
        setExtraMinutes={setExtraMinutes}
        isPending={isPending}
        device={device}
        t={t}
        isRTL={isRTL}
      />
    </motion.div>
  );
};
