"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Monitor, Package, Users, Settings2, ShieldCheck, Shield } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { getCurrentUser } from '@/app/actions';

export default function SettingsLayoutClient({ children, currentUser }: { children: React.ReactNode, currentUser: any }) {
  const pathname = usePathname();
  const { t, isRTL, lang } = useLang();
  const user = currentUser;

  const tabs = [
    { id: 'settings', name: lang === 'ar' ? 'الإعدادات العامة' : 'General Settings', href: '/settings/general', icon: Settings2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
    { id: 'devices', name: t('nav.devices'), href: '/settings/devices', icon: Monitor, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: 'inventory', name: t('nav.inventory'), href: '/settings/inventory', icon: Package, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { id: 'staff', name: t('nav.staff'), href: '/settings/staff', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { id: 'audit', name: lang === 'ar' ? 'سجل التدقيق' : 'Audit Logs', href: '/settings/audit', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const isRootAdmin = user?.role === 'ADMIN';
  const perms = user?.permissions || [];

  const visibleTabs = tabs.filter(tab => {
    if (isRootAdmin) return true;
    if (tab.id === 'settings' && perms.includes('settings.manage')) return true;
    if (tab.id === 'devices' && perms.includes('devices.manage')) return true;
    if (tab.id === 'inventory' && perms.includes('inventory.manage')) return true;
    if (tab.id === 'staff' && perms.includes('staff.manage')) return true;
    return false;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-[calc(100vh-6rem)]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Settings Navigation */}
      <div className="lg:w-64 shrink-0 flex flex-col gap-2">
        <div className="mb-4 px-2">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Settings className="w-6 h-6 text-fuchsia-400" />
            {t('nav.settings')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Administrative Access
          </p>
        </div>

        <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
          {visibleTabs.map(tab => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold min-w-fit lg:min-w-0 ${
                  isActive 
                    ? 'bg-card border border-border shadow-sm text-foreground ring-1 ring-border' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div className={`p-2 rounded-xl ${isActive ? tab.bg : 'bg-transparent'}`}>
                  <tab.icon className={`w-5 h-5 ${isActive ? tab.color : 'text-muted-foreground'}`} />
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 glass-card rounded-3xl border border-border overflow-y-auto shadow-sm p-4 md:p-8">
        {children}
      </div>
    </div>
  );
}
