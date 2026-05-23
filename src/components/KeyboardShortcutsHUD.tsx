"use client";

import React, { useEffect, useState } from "react";
import { X, Command, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";

export default function KeyboardShortcutsHUD() {
  const { t, isRTL } = useLang();
  const [open, setOpen] = useState(false);

  const SHORTCUTS = [
    { key: "F1 / ?", label: t('shortcuts.toggleHelp') },
    { key: "Escape", label: t('shortcuts.closeModal') },
    { key: "Ctrl + K", label: t('shortcuts.globalSearch') },
    { key: "D", label: t('shortcuts.focusDashboard') },
    { key: "N", label: t('shortcuts.newSession') },
    { key: "Enter", label: t('shortcuts.confirm') },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1" || (e.key === "?" && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="glass-card w-full max-w-md rounded-3xl border border-border relative z-10 overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <Keyboard className="w-4 h-4 text-violet-400" />
                </div>
                <h2 className="font-black text-foreground">{t('shortcuts.title')}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <kbd className="px-2.5 py-1 rounded-lg bg-muted text-xs font-bold text-foreground border border-border font-mono">
                    {s.key}
                  </kbd>
                  <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
