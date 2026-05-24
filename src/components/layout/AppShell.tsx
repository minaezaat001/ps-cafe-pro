"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "sonner";
import { useTheme } from "@/lib/ThemeContext";
import { Menu, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialStatus } from "@/components/TrialStatus";
import { PendingOrdersWidget } from "@/components/PendingOrdersWidget";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import KeyboardShortcutsHUD from "@/components/KeyboardShortcutsHUD";
import GlobalSearch from "@/components/GlobalSearch";

const MobileHeader = ({ onOpen, hidden = false }: { onOpen: () => void; hidden?: boolean }) => {
  if (hidden) return null;
  return (
    <header className="lg:hidden h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Gamepad2 className="text-primary w-4 h-4" />
        </div>
        <h1 className="text-sm font-black tracking-tighter text-foreground italic uppercase">
          PS CAFE <span className="text-blue-600 dark:text-blue-400">PRO</span>
        </h1>
      </div>
      <button 
        onClick={onOpen}
        className="p-2 -me-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const pathname = usePathname();

  const isMenuPage = pathname.startsWith('/menu');
  const isPrint = pathname.startsWith('/print');
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/sign-up');
  const isSuperAdmin = pathname.startsWith('/super-admin');
  const isFullWidth = isMenuPage || isPrint || isAuth;

  return (
    <div className={cn("flex min-h-screen overflow-hidden bg-background", isFullWidth ? "flex-col" : "flex-row")}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        hidden={isFullWidth}
      />
      
      <div className={cn("flex-1 flex flex-col min-w-0 h-screen overflow-hidden", isFullWidth ? "w-full" : "")}>
        <MobileHeader onOpen={() => setIsSidebarOpen(true)} hidden={isFullWidth} />
        {!isFullWidth && !isPrint && (
          <div className="hidden lg:flex items-center px-6 pt-3 pb-0 gap-2">
            <div className="ms-auto"><GlobalSearch /></div>
          </div>
        )}
        
        {!isFullWidth && <AnnouncementBanner />}
        {!isFullWidth && <ImpersonationBanner />}
        <main className={cn("flex-1 relative overflow-y-auto scrollbar-hide", !isFullWidth ? "bg-transparent" : "bg-background")}>
          {!isFullWidth && (
            <>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
            </>
          )}

          <div className={cn("relative z-10", isFullWidth ? "" : "p-4 md:p-8")}>
            {!isFullWidth && <TrialStatus />}
            {children}
          </div>
        </main>
      </div>

      <KeyboardShortcutsHUD />
      {!isFullWidth && !isSuperAdmin && <PendingOrdersWidget />}
      <Toaster position="top-right" theme={theme === 'dark' ? 'dark' : 'light'} richColors closeButton />
    </div>
  );
}
