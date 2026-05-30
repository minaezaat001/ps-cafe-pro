import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accentColor: string;
  glowColor?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  accentColor,
  glowColor,
}: StatCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden">
      <div
        className={cn(
          "absolute top-0 start-0 w-1 h-full rounded-e-lg",
          accentColor
        )}
      />
      <div
        className={cn(
          "p-2.5 rounded-xl shrink-0",
          glowColor || "bg-primary/10"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-black text-foreground mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
