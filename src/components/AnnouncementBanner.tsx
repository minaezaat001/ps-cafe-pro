"use client";

import React, { useEffect, useState } from "react";
import { getActiveAnnouncements } from "@/app/actions";
import { X, Megaphone, AlertTriangle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const LS_KEY = "ps-cafe-dismissed-announcements";

type Announcement = {
  id: string;
  message: string;
  type: string;
  createdAt: string;
};

const TYPE_STYLES: Record<string, { icon: typeof Megaphone; bg: string; border: string; text: string; iconColor: string }> = {
  WARNING: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-200",
    iconColor: "text-amber-400",
  },
  UPDATE: {
    icon: Sparkles,
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    text: "text-violet-200",
    iconColor: "text-violet-400",
  },
  INFO: {
    icon: Megaphone,
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-200",
    iconColor: "text-blue-400",
  },
};

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(getDismissed());

    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await getActiveAnnouncements();
        if (!cancelled) setAnnouncements(data);
      } catch {
        // Silently fail
      }
    };

    fetch();
    // Refresh every 10 minutes
    const interval = setInterval(fetch, 600_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="w-full space-y-1.5 px-4 md:px-6 pt-1.5">
      <AnimatePresence>
        {visible.map((a) => {
          const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.INFO;
          const Icon = style.icon;

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md",
                style.bg,
                style.border,
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", style.iconColor)} />
              <p className={cn("text-sm font-semibold flex-1", style.text)}>{a.message}</p>
              <button
                onClick={() => handleDismiss(a.id)}
                className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
