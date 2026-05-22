"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BillSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  device: { id: string; number: string; type: string };
  t: (key: any) => string;
  isRTL: boolean;
  accent: { hex: string; text: string; bg: string; border: string; glow: string; tagBg: string; tagText: string };
  billBreakdown: { single: number; multi: number; items: number; gaming: number; segments: any[] };
  total: string;
  onRemoveOrder: (orderId: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}

export default function BillSummaryModal({
  isOpen,
  onClose,
  session,
  device,
  t,
  isRTL,
  accent,
  billBreakdown,
  total,
  onRemoveOrder,
  confirmDeleteId,
  setConfirmDeleteId,
}: BillSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-[10000] border-t-4"
        style={{ borderTopColor: accent.hex, boxShadow: `0 20px 50px -12px ${accent.hex}33` }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className={cn('flex justify-between items-center mb-6', isRTL ? 'flex-row-reverse' : 'flex-row')}>
          <h2 className="text-xl font-black text-foreground">{t('device.billSummary')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
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

          <div className="py-3 border-b border-border">
            {billBreakdown.segments && billBreakdown.segments.length > 0 ? (
              <div className="space-y-2">
                {billBreakdown.segments.map((seg: any, idx: number) => (
                  <div key={idx} className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                    <span className="text-muted-foreground font-bold uppercase">
                      {t('device.account')} {seg.deviceType} ({seg.mode === 'SINGLE' ? t('device.single') : t('device.multi')})
                    </span>
                    <span className="font-bold text-foreground font-mono">{seg.cost.toFixed(2)} EGP</span>
                  </div>
                ))}
              </div>
            ) : billBreakdown.single > 0 || billBreakdown.multi > 0 ? (
              <div className="space-y-2">
                {billBreakdown.single > 0 && (
                  <div className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                    <span className="text-muted-foreground font-bold uppercase">
                      {t('device.account')} {device.type} ({t('device.single')})
                    </span>
                    <span className="font-bold text-foreground font-mono">{billBreakdown.single.toFixed(2)} EGP</span>
                  </div>
                )}
                {billBreakdown.multi > 0 && (
                  <div className={cn("flex justify-between text-sm items-center", isRTL && "flex-row-reverse")}>
                    <span className="text-muted-foreground font-bold uppercase">
                      {t('device.account')} {device.type} ({t('device.multi')})
                    </span>
                    <span className="font-bold text-foreground font-mono">{billBreakdown.multi.toFixed(2)} EGP</span>
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
                        onClick={() => confirmDeleteId === o.id ? onRemoveOrder(o.id) : setConfirmDeleteId(o.id)} 
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
            {total}
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-3 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted transition-all mt-4">
          {t('device.closeView')}
        </button>
      </motion.div>
    </div>
  );
}
