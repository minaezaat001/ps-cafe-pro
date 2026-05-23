"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Monitor, Package, Users, ArrowRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useKeyPress } from "@/lib/useKeyPress";
import { useLang } from "@/lib/LanguageContext";

type SearchResult = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: typeof Monitor;
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t, isRTL } = useLang();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const all: SearchResult[] = [
      { id: "dash", label: t('nav.dashboard'), sublabel: t('dashboard.liveStatus'), href: "/", icon: Monitor },
      { id: "cafe", label: t('nav.cafeteria'), sublabel: t('cafeteria.subtitle'), href: "/cafeteria", icon: Package },
      { id: "shift", label: t('nav.shift'), sublabel: isRTL ? "إدارة الورديات" : "Shift management", href: "/shift", icon: Users },
      { id: "finance", label: t('nav.finance'), sublabel: isRTL ? "المعاملات المالية" : "Financial transactions", href: "/finance", icon: FileText },
      { id: "reports", label: t('nav.reports'), sublabel: t('reports.subtitle'), href: "/reports", icon: FileText },
      { id: "settings", label: t('nav.settings'), sublabel: t('settings.subtitle'), href: "/settings/general", icon: Users },
      { id: "devices", label: t('nav.devices'), sublabel: t('devices.subtitle'), href: "/settings/devices", icon: Monitor },
      { id: "inventory", label: t('nav.inventory'), sublabel: t('inventory.subtitle'), href: "/settings/inventory", icon: Package },
      { id: "staff", label: t('nav.staff'), sublabel: t('staff.subtitle'), href: "/settings/staff", icon: Users },
      { id: "audit", label: isRTL ? "سجل التدقيق" : "Audit Log", sublabel: isRTL ? "مسار تدقيق النظام" : "System audit trail", href: "/settings/audit", icon: FileText },
    ];
    setResults(all.filter((r) => r.label.toLowerCase().includes(lower) || r.sublabel.toLowerCase().includes(lower)));
  }, [t, isRTL]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  useKeyPress("Escape", () => { if (open) setOpen(false); }, open);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-xs font-semibold"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('search.triggerLabel')}</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground/60 border border-border">
          Ctrl+K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -8 }}
              className="glass-card w-full max-w-xl rounded-3xl border border-border relative z-10 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-foreground placeholder:text-muted-foreground/40"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); }} className="p-1 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="px-2 py-1 rounded-lg bg-muted text-[10px] font-mono text-muted-foreground/60 border border-border shrink-0">
                  ESC
                </kbd>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-hide p-2">
                {results.length === 0 && query && (
                  <div className="text-center py-8 text-muted-foreground font-medium text-sm">{t('search.noResults')}</div>
                )}
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(r.href)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-muted/50 transition-all text-left group"
                  >
                    <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-foreground transition-colors">
                      <r.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
