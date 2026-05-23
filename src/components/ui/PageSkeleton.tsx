"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  cards?: number;
  rows?: number;
  className?: string;
  variant?: 'cards' | 'table' | 'stats';
}

export default function PageSkeleton({ cards = 6, rows = 5, className, variant = 'cards' }: PageSkeletonProps) {
  if (variant === 'table') {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  );
}
