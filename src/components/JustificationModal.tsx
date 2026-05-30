"use client";

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  isRTL?: boolean;
  isLoading?: boolean;
}

export default function JustificationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isRTL = false,
  isLoading = false,
}: JustificationModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim().length < 10) {
      alert(isRTL ? 'يرجى كتابة سبب مفصل (أكثر من ١٠ أحرف)' : 'Please provide a detailed reason (at least 10 characters)');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={!isLoading ? onClose : undefined} />
      
      <div className="relative bg-card border border-amber-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden">
        {/* colored top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-amber-500" />
        
        <button
          onClick={() => !isLoading && onClose()}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border bg-amber-500/10 border-amber-500/20">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          
          <h2 className="text-xl font-black text-foreground mb-2">
            {title}
          </h2>
          
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {description}
          </p>

          {/* Reason Input */}
          <div className="w-full mb-6">
            <label className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block text-start`}>
              {isRTL ? 'السبب / التبرير' : 'Reason / Justification'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isRTL ? 'اكتب سبب قيامك بهذا الإجراء...' : 'Explain why you are performing this action...'}
              className={`w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all min-h-[100px] resize-none text-start`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? `${reason.length} حرف (الحد الأدنى ١٠ أحرف)` : `${reason.length} characters (minimum 10)`}
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={isLoading}
              onClick={() => !isLoading && onClose()}
              className="flex-1 py-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition-all"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              disabled={isLoading || reason.trim().length < 10}
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isRTL ? 'تأكيد' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
