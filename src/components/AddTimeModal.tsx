"use client";

import React from 'react';
import { Timer, RefreshCw } from 'lucide-react';
import ModalShell from "@/components/ui/ModalShell";
import { cn } from '@/lib/utils';

export interface AddTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTime: () => void;
  extraMinutes: string;
  setExtraMinutes: (val: string) => void;
  isPending: boolean;
  device: { number: string };
  t: (key: any) => string;
  isRTL: boolean;
}

export default function AddTimeModal({
  isOpen,
  onClose,
  onAddTime,
  extraMinutes,
  setExtraMinutes,
  isPending,
  device,
  t,
  isRTL,
}: AddTimeModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
    >
      <div dir={isRTL ? 'rtl' : 'ltr'} className="text-center">
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
            <button disabled={isPending} onClick={onClose}
              className="py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground transition-all">
              {t('device.back')}
            </button>
            <button disabled={isPending || !extraMinutes} onClick={onAddTime}
              className="py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('settings.confirm')}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
