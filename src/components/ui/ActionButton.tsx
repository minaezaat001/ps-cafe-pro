"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  variant?: "primary" | "danger" | "ghost" | "success" | "warning";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  type?: "button" | "submit";
}

const variantStyles = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20",
  danger:
    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
  success:
    "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20",
  warning:
    "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20",
};

const sizeStyles = {
  sm: "px-3 py-2 text-xs rounded-lg",
  md: "px-5 py-3 text-sm rounded-xl",
  lg: "px-7 py-4 text-base rounded-xl",
};

export default function ActionButton({
  variant = "primary",
  children,
  onClick,
  disabled,
  fullWidth,
  size = "md",
  icon,
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-bold transition-all duration-200 active:scale-[0.98] inline-flex items-center justify-center gap-2",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
