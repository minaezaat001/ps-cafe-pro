"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Sparkles, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { getTrialStatus } from '@/app/actions/auth.actions';

export function TrialStatus() {
  const [status, setStatus] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const { isRTL } = useLang();

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
        initial={{ height: 0, opacity: 0, y: -20 }}
        animate={{ height: 'auto', opacity: 1, y: 0 }}
        exit={{ height: 0, opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 px-2 sm:px-0"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-lg transition-all duration-500",
            isExpired
              ? "bg-rose-500/10 border-rose-500/30 shadow-rose-500/10"
              : "bg-amber-500/10 border-amber-500/30 shadow-amber-500/10"
          )}
        >
          {/* Subtle glow effect behind */}
          <div className={cn(
            "absolute top-0 w-[500px] h-full blur-3xl opacity-20 pointer-events-none",
            isRTL ? "right-0" : "left-0",
            isExpired ? "bg-rose-500" : "bg-amber-500"
          )} />

          <div className="relative z-10 p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                isExpired 
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/20" 
                  : "bg-amber-500/20 text-amber-500 border border-amber-500/20"
              )}>
                {isExpired ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              
              <div className="flex flex-col">
                <h3 className={cn(
                  "font-black text-sm sm:text-base tracking-tight mb-0.5",
                  isExpired ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                )}>
                  {isExpired
                    ? (isRTL ? "انتهت الفترة التجريبية!" : "Trial period ended!")
                    : (isRTL 
                        ? `باقي ${status.daysRemaining} أيام على انتهاء الفترة التجريبية.` 
                        : `Trial ends in ${status.daysRemaining} days.`)}
                </h3>
                <p className={cn(
                  "text-xs font-semibold opacity-80",
                  isExpired ? "text-rose-600/80 dark:text-rose-400/80" : "text-amber-700/80 dark:text-amber-400/80"
                )}>
                  {isExpired 
                    ? (isRTL ? "يرجى الاشتراك الآن للمتابعة وعدم فقدان الوصول." : "Please subscribe now to continue without losing access.")
                    : (isRTL ? "استمتع بجميع المزايا الاحترافية." : "Enjoy all premium features and upgrade to keep your cafe running smoothly.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                className={cn(
                  "flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                  isExpired 
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 shadow-lg" 
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 shadow-lg"
                )}
              >
                <CreditCard className="w-4 h-4" />
                {isRTL ? "تفعيل الاشتراك" : "Subscribe"}
              </button>

              {!isExpired && (
                <button
                  onClick={() => setDismissed(true)}
                  className={cn(
                    "p-2.5 rounded-xl transition-colors shrink-0",
                    "hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
                  )}
                  title={isRTL ? "إخفاء" : "Dismiss"}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
