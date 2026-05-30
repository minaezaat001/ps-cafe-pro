import React from "react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AlertBannerProps {
  variant: "danger" | "warning" | "info";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

const variantStyles = {
  danger: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    desc: "text-red-300/70",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    desc: "text-amber-300/70",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    desc: "text-blue-300/70",
    icon: Info,
  },
};

export default function AlertBanner({
  variant,
  title,
  description,
  actionLabel,
  actionHref,
  icon: CustomIcon,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const Icon = CustomIcon ? () => <>{CustomIcon}</> : styles.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border",
        styles.bg,
        styles.border
      )}
    >
      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", styles.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-bold text-sm", styles.text)}>{title}</p>
        <p className={cn("text-sm mt-0.5", styles.desc)}>{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(
            "shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-colors",
            styles.bg,
            styles.text,
            "hover:opacity-80"
          )}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
