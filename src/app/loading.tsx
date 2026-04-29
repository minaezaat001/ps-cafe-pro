"use client";

import React from 'react';
import { useLang } from '@/lib/LanguageContext';

export default function LoadingDashboard() {
  const { isRTL } = useLang();
  
  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <section>
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="h-8 w-48 bg-card rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-card rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="glass-card p-5 rounded-[24px] h-[220px] flex flex-col justify-between"
            >
              {/* Top skeleton (Device name, badge) */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/40 animate-pulse"></div>
                  <div>
                    <div className="h-5 w-24 bg-muted/40 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-16 bg-muted/40 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-muted/40 rounded-full animate-pulse"></div>
              </div>

              {/* Middle skeleton (Stats) */}
              <div className="flex justify-between items-center my-4">
                <div className="h-10 w-24 bg-muted/40 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-muted/40 rounded animate-pulse"></div>
              </div>

              {/* Bottom skeleton (Action buttons) */}
              <div className="flex gap-2">
                <div className="h-12 flex-1 bg-muted/40 rounded-xl animate-pulse"></div>
                <div className="h-12 w-12 bg-muted/40 rounded-xl animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
