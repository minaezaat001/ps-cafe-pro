"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  maxWidth?: string;
  children: React.ReactNode;
  title?: string;
  titleIcon?: React.ReactNode;
  preventClose?: boolean;
}

export default function ModalShell({
  isOpen,
  onClose,
  accentColor = "border-blue-500",
  maxWidth = "max-w-md",
  children,
  title,
  titleIcon,
  preventClose,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={preventClose ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full rounded-2xl bg-card backdrop-blur-xl border border-border p-6 shadow-xl",
              `border-t-4 ${accentColor}`,
              maxWidth
            )}
          >
            {!preventClose && (
              <button
                onClick={onClose}
                className="absolute top-4 end-4 p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {title && (
              <div className="flex items-center gap-3 mb-6">
                {titleIcon && (
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {titleIcon}
                  </div>
                )}
                <h3 className="text-lg font-black text-foreground">{title}</h3>
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
