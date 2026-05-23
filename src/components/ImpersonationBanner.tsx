"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/app/actions";
import { stopImpersonation } from "@/app/actions/super-admin.actions";
import { LogOut, ShieldAlert, User } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function ImpersonationBanner() {
  const { t } = useLang();
  const [state, setState] = useState<{
    visible: boolean;
    username: string;
    tenantLabel: string;
  }>({ visible: false, username: "", tenantLabel: "" });

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.isImpersonating) {
        setState({
          visible: true,
          username: u.username,
          tenantLabel: u.tenantId?.slice(0, 8) ?? "Tenant",
        });
      }
    });
  }, []);

  if (!state.visible) return null;

  return (
    <div className="sticky top-0 z-[9999] w-full bg-gradient-to-r from-amber-600/20 via-amber-500/15 to-amber-600/20 border-b border-amber-500/30 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-bold text-amber-300">
            {t('impersonation.banner')}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-200 text-xs font-semibold border border-amber-500/20">
            <User className="w-3 h-3" />
            {state.tenantLabel}
          </span>
          <span className="text-muted-foreground text-xs hidden sm:inline">
            {t('impersonation.description')}
          </span>
        </div>

        <button
          onClick={async () => {
            try {
              await stopImpersonation();
            } catch {
              window.location.href = "/super-admin/dashboard";
            }
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-all text-xs font-bold"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t('impersonation.exit')}
        </button>
      </div>
    </div>
  );
}
