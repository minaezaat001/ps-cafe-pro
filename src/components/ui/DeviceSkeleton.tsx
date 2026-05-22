"use client";

import { cn } from "@/lib/utils";

interface DeviceSkeletonProps {
  isCompact?: boolean;
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl bg-card/40",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",
        className
      )}
    />
  );
}

export function DeviceSkeleton({ isCompact }: DeviceSkeletonProps) {
  if (isCompact) {
    return (
      <div
        className={cn(
          "glass-card p-3 pr-4 rounded-xl flex items-center justify-between border-l-4",
          "border-slate-500/30 opacity-80"
        )}
      >
        <div className="flex items-center gap-3">
          <ShimmerBlock className="w-10 h-10 rounded" />
          <div className="space-y-2">
            <ShimmerBlock className="h-3.5 w-20" />
            <ShimmerBlock className="h-3 w-14" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ShimmerBlock className="h-4 w-16" />
          <div className="flex gap-1">
            <ShimmerBlock className="w-7 h-7 rounded" />
            <ShimmerBlock className="w-7 h-7 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ShimmerBlock className="h-3 w-14" />
          <ShimmerBlock className="h-5 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-card/30">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-11 h-11 rounded-xl" />
            <div className="space-y-2">
              <ShimmerBlock className="h-5 w-24" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-9 h-9 rounded-xl" />
            <ShimmerBlock className="w-28 h-7 rounded-full" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-3 pt-1">
        {/* Timer */}
        <ShimmerBlock className="h-[88px] w-full rounded-xl" />

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <ShimmerBlock className="h-[50px] rounded-xl" />
          <ShimmerBlock className="h-[50px] rounded-xl" />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <ShimmerBlock className="h-[44px] rounded-xl" />
          <ShimmerBlock className="h-[44px] rounded-xl" />
        </div>

        {/* Bill Bar */}
        <ShimmerBlock className="h-[52px] w-full rounded-xl" />

        {/* End Session */}
        <ShimmerBlock className="h-[44px] w-full rounded-xl" />
      </div>

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/5" />
    </div>
  );
}

export function DeviceSkeletonGrid({ count = 8, isCompact }: { count?: number; isCompact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <DeviceSkeleton key={i} isCompact={isCompact} />
      ))}
    </>
  );
}
