"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (targetDeviceId: string) => void;
  allDevices: any[];
  currentDeviceId: string;
  t: (key: any) => string;
  isRTL: boolean;
}

export default function TransferModal({
  isOpen,
  onClose,
  onTransfer,
  allDevices,
  currentDeviceId,
  t,
  isRTL,
}: TransferModalProps) {
  if (!isOpen) return null;

  const availableDevices = allDevices.filter(d => d.id !== currentDeviceId && d.sessions.length === 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
        onClick={onClose}
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
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
          {availableDevices.map(d => (
            <button key={d.id} onClick={() => onTransfer(d.id)}
              className="w-full p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all flex justify-between items-center group">
              <span className="font-bold text-base text-foreground">Station #{d.number} ({d.type})</span>
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
            </button>
          ))}
          {availableDevices.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8 uppercase tracking-widest">{t('device.noAvailableStations')}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
