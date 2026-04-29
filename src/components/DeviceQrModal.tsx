"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  menuUrl: string;
  deviceLabel: string;
  isRTL?: boolean;
};

export function DeviceQrModal({ open, onClose, menuUrl, deviceLabel, isRTL }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        <motion.button
          type="button"
          aria-label="Close"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className={cn(
            "relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-2xl",
            isRTL && "text-right"
          )}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className={cn("mb-4 flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
            <div>
              <h2 className="text-lg font-black text-foreground">
                {isRTL ? "منيو العميل (QR)" : "Customer menu (QR)"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRTL ? `جهاز ${deviceLabel}` : `Device ${deviceLabel}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-4">
            <QRCodeSVG value={menuUrl} size={200} level="M" includeMargin />
            <p className="text-[10px] text-center text-neutral-600 font-mono break-all max-w-full leading-relaxed">
              {menuUrl}
            </p>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
            {isRTL
              ? "امسح الكود من موبايل العميل لفتح المنيو وإضافة طلبات للجلسة النشطة على هذا الجهاز."
              : "Customers scan to open the menu and add items to the active session on this station."}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
