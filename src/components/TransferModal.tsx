"use client";

import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import ModalShell from "@/components/ui/ModalShell";
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
  const availableDevices = allDevices.filter(d => d.id !== currentDeviceId && d.sessions.length === 0);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      accentColor="border-violet-500"
      maxWidth="max-w-sm"
    >
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 mb-5">
          <ArrowRightLeft className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-black text-foreground">{t('device.transferStation')}</h2>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pe-1 scrollbar-hide">
          {availableDevices.map(d => (
            <button key={d.id} onClick={() => onTransfer(d.id)}
              className="w-full p-4 rounded-xl border border-border bg-card hover:bg-muted transition-all flex justify-between items-center group">
              <span className="font-bold text-base text-foreground">{d.number} ({d.type})</span>
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
            </button>
          ))}
          {availableDevices.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8 uppercase tracking-widest">{t('device.noAvailableStations')}</p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
