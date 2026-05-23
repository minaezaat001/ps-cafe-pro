"use client";

import React, { useEffect, useState } from "react";
import { X, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPriceHistory, type PriceHistoryEntry } from "@/app/actions/price-history.actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  entityType: "Device" | "InventoryItem";
  entityId: string;
  entityName: string;
  open: boolean;
  onClose: () => void;
}

export default function PriceHistoryModal({ entityType, entityId, entityName, open, onClose }: Props) {
  const { t } = useLang();
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getPriceHistory(entityType, entityId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, entityType, entityId]);

  const formatChange = (key: string, val: unknown) => {
    if (typeof val === "number") return val.toFixed(2);
    return String(val ?? "—");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 10 }}
            className="glass-card w-full max-w-2xl rounded-3xl border border-border relative z-10 overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <History className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-black text-foreground">{t('priceHistory.title')}</h2>
                  <p className="text-xs text-muted-foreground font-medium">{entityName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground font-medium">{t('priceHistory.loading')}</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">{t('priceHistory.noChanges')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((e) => {
                    const keys = Object.keys(e.changes);
                    return (
                      <div key={e.id} className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <span className="font-bold text-muted-foreground">{e.changedBy}</span>
                          <span className="text-muted-foreground">{format(new Date(e.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                        <div className="space-y-1.5">
                          {keys.map((k) => (
                            <div key={k} className="flex items-center gap-2 text-sm">
                              <span className="font-semibold text-muted-foreground w-28 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                              <span className="text-rose-400 line-through font-medium">{formatChange(k, e.changes[k].old)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-emerald-400 font-bold">{formatChange(k, e.changes[k].new)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
