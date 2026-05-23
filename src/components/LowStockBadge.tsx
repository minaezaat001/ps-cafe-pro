"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LowStockBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const { getLowStockItems } = await import("@/app/actions/inventory.actions");
        const items = await getLowStockItems();
        if (!cancelled) setCount(items.length);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-black">
      <AlertTriangle className="w-3 h-3" />
      {count}
    </span>
  );
}
