"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  device: { id: string; number: string; type: string };
  t: (key: any) => string;
  isRTL: boolean;
  accent: { hex: string; text: string; bg: string; border: string; glow: string; tagBg: string; tagText: string };
  elapsed: string;
  remainingLabel: string | null;
  isPending: boolean;
  total: string;
  billBreakdown: { single: number; multi: number; items: number; gaming: number; subtotal: number; discountPercent: number; discount: number; segments: any[] };
  onEnd: () => void;
  onRemoveOrder: (orderId: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  printSettings: { enabled: boolean; autoPrint: boolean; paperSize?: string };
  printChecked: boolean;
  setPrintChecked: (checked: boolean) => void;
  discountPercent: number;
  onDiscountChange: (val: number) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  session,
  device,
  t,
  isRTL,
  accent,
  elapsed,
  remainingLabel,
  isPending,
  total,
  billBreakdown,
  onEnd,
  onRemoveOrder,
  confirmDeleteId,
  setConfirmDeleteId,
  printSettings,
  printChecked,
  setPrintChecked,
  discountPercent,
  onDiscountChange,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  const isTimeUp = session?.type === 'FIXED' && remainingLabel === t('device.timeUp');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
        onClick={() => {
          if (!isTimeUp && !isPending) {
            onClose();
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
          {!isTimeUp && (
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition text-muted-foreground">
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
                {session?.isMulti ? t('device.multi') : t('device.single')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {billBreakdown.segments && billBreakdown.segments.length > 0 ? (
              <div className="space-y-2 py-2 border-b border-border">
                {billBreakdown.segments.map((seg: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">
                      {t('device.account')} {seg.deviceType} ({seg.mode === 'SINGLE' ? t('device.single') : t('device.multi')})
                    </span>
                    <span className="font-bold text-foreground font-mono">{seg.cost.toFixed(2)} EGP</span>
                  </div>
                ))}
              </div>
            ) : billBreakdown.single > 0 || billBreakdown.multi > 0 ? (
              <div className="space-y-2 py-2 border-b border-border">
                {billBreakdown.single > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">{t('device.singleCost')}</span>
                    <span className="font-bold text-foreground font-mono">{billBreakdown.single.toFixed(2)} EGP</span>
                  </div>
                )}
                {billBreakdown.multi > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">{t('device.multiCost')}</span>
                    <span className="font-bold text-foreground font-mono">{billBreakdown.multi.toFixed(2)} EGP</span>
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
                          onClick={() => confirmDeleteId === o.id ? onRemoveOrder(o.id) : setConfirmDeleteId(o.id)} 
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

          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountPercent}
                onChange={(e) => onDiscountChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-20 px-2 py-1 rounded-lg bg-card border border-border text-foreground font-bold text-sm text-center"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground font-bold">% {t('device.discount')}</span>
            </div>
          </div>

          <div className={cn("pt-4 border-t-2 border-dashed border-border", isRTL ? "text-right" : "text-left")}>
            <p className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('device.totalToCollect')}</p>
            <div className={cn("text-4xl font-black tracking-tighter", accent.text, isRTL ? "flex flex-row-reverse justify-start" : "flex justify-start")}>
              <span className="text-base mt-auto mb-1 mx-1 text-muted-foreground">EGP</span>
              {total}
            </div>
            {billBreakdown.discount > 0 && (
              <p className="text-xs text-emerald-400 font-bold mt-1">
                {isRTL ? `توفير ${billBreakdown.discount.toFixed(2)} ج.م.` : `Save ${billBreakdown.discount.toFixed(2)} EGP`}
              </p>
            )}
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

        <div className={cn("grid gap-3", isTimeUp ? "grid-cols-1" : "grid-cols-2")}>
          {!isTimeUp && (
            <button onClick={onClose}
              className="py-3 rounded-xl border border-border text-foreground font-bold hover:bg-muted transition-all">
              {t('device.back')}
            </button>
          )}
          <button disabled={isPending} onClick={onEnd}
            className="py-3 rounded-xl text-white font-black tracking-wide shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            {isPending ? t('device.finishing') : isTimeUp ? t('common.close') : t('device.collectEnd')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
