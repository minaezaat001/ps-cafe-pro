"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTrialBannerState } from '@/lib/tenant-guard';
import { useLang } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';

import { getTrialStatus } from '@/app/actions/auth.actions';

export function TrialStatus() {
  const [status, setStatus] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const { lang, isRTL } = useLang();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getTrialStatus();
        setStatus(res);
      } catch (err) {
        console.error(err);
      }
    };
    checkStatus();
  }, []);

  if (!status || !status.visible || (dismissed && !status.expired)) return null;

  const isExpired = status.expired;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          "relative overflow-hidden border-b transition-all duration-500",
          isExpired 
            ? "bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400/20" 
            : "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300/20"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {isExpired ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-sm md:text-base leading-tight">
                {isExpired 
                  ? (isRTL ? "انتهت الفترة التجريبية! يرجى الاشتراك للمتابعة." : "Trial period ended! Please subscribe to continue.")
                  : (isRTL 
                      ? `باقي ${status.daysRemaining} أيام على انتهاء الفترة التجريبية.` 
                      : `Trial ends in ${status.daysRemaining} days. Upgrade now to keep your cafe running smoothly!`)}
              </p>
              {!isExpired && (
                <p className="text-[10px] md:text-xs opacity-90 font-medium uppercase tracking-wider mt-0.5">
                  {isRTL ? "استمتع بجميع المزايا الاحترافية" : "Enjoy all premium features"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className={cn(
                "px-5 py-2 rounded-xl font-black text-xs uppercase tracking-tight flex items-center gap-2 transition-all shadow-lg active:scale-95",
                isExpired ? "bg-white text-rose-600 hover:bg-rose-50" : "bg-white text-amber-600 hover:bg-amber-50"
              )}
            >
              <CreditCard className="w-4 h-4" />
              {isRTL ? "تفعيل الاشتراك" : "Activate Subscription"}
            </button>
            
            {!isExpired && (
              <button 
                onClick={() => setDismissed(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
