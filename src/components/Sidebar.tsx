"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Gamepad2,
  LayoutDashboard,
  Package,
  BarChart3,
  Users,
  LogOut,
  Coffee,
  Monitor,
  Globe,
  ChevronRight,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logout, getCurrentUser, getActiveShift, getAppSetting } from '@/app/actions';
import { toast } from 'sonner';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import LowStockBadge from '@/components/LowStockBadge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar = ({ 
  isOpen, 
  onClose,
  hidden = false
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  hidden?: boolean;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cafeName, setCafeName] = useState<string>("PS CAFE");
  const { t, toggleLanguage, lang, isRTL } = useLang();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, fetchedName] = await Promise.all([
          getCurrentUser(),
          getAppSetting('CAFE_NAME')
        ]);
        setUser(u);
        if (fetchedName) setCafeName(fetchedName);
      } catch (err) {
        console.error('Sidebar Data Error:', err);
      }
    };
    fetchData();
  }, [pathname]);

  const handleLogout = async () => {
    if (!confirm(t('nav.signOutConfirm'))) return;

    // Super Admin doesn't have shifts — skip the check
    if (user?.role !== 'SUPER_ADMIN') {
      try {
        const activeShift = await getActiveShift();
        if (activeShift) {
          toast.error(isRTL ? "يجب إغلاق الوردية والكاشير قبل تسجيل الخروج!" : "You must close your shift before logging out!");
          router.push("/shift?pending=logout");
          if (onClose) onClose(); // Close mobile menu if open
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    await logout();
  };

  const menuItems = [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard' as const, href: '/', colorActive: 'text-blue-400' },
    { icon: Coffee,          labelKey: 'nav.cafeteria' as const, href: '/cafeteria', colorActive: 'text-amber-400' },
    { icon: ShieldCheck,     labelKey: 'nav.shift'     as const, href: '/shift',   colorActive: 'text-teal-400' },
    { icon: Wallet,          labelKey: 'nav.finance'   as const, href: '/finance',   colorActive: 'text-emerald-400' },
    { icon: BarChart3,       labelKey: 'nav.reports'   as const, href: '/reports', colorActive: 'text-blue-400' },
    { icon: Settings,        labelKey: 'nav.settings'  as const, href: '/settings/general', colorActive: 'text-fuchsia-400' },
  ];

  if (hidden) return null;

  return (
    <>
      {/* Overlay - Mobile Only */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 z-[70] w-72 flex flex-col p-5 h-screen transition-all duration-300 transform shrink-0',
          'bg-background border-r border-border',
          'start-0 border-e',
          isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-[100%]' : 'translate-x-[-100%]'),
          'lg:relative lg:translate-x-0 lg:flex lg:w-64'
        )}
      >
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className={cn("lg:hidden absolute top-4 end-4 p-2 text-muted-foreground hover:bg-muted rounded-lg")}
        >
          <X className="w-5 h-5" />
        </button>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Gamepad2 className="text-white w-5 h-5" />
        </div>
        <div className="text-start">
          <h1 className="font-black tracking-tight text-foreground leading-tight uppercase truncate max-w-[160px]">
            {cafeName}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{t('nav.managementSuite')}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/settings/general' && pathname.startsWith('/settings')) || (item.href === '/shift' && pathname.startsWith('/shift'));
          const Icon = item.icon;

          const isRootAdmin = user?.role === 'ADMIN';
          const perms = user?.permissions || [];

          if (item.labelKey === 'nav.dashboard' && !isRootAdmin && !perms.includes('dashboard.manage')) return null;
          if (item.labelKey === 'nav.cafeteria' && !isRootAdmin && !perms.includes('cafeteria.manage')) return null;
          if (item.labelKey === 'nav.shift' && !isRootAdmin && !perms.includes('shift.manage')) return null;
          if (item.labelKey === 'nav.finance' && !isRootAdmin && !perms.includes('finance.manage')) return null;
          if (item.labelKey === 'nav.reports' && !isRootAdmin && !perms.includes('reports.view')) return null;
          
          if (item.labelKey === 'nav.settings') {
             const hasAnySettingPerm = perms.includes('settings.manage') || perms.includes('devices.manage') || perms.includes('inventory.manage') || perms.includes('staff.manage');
             if (!isRootAdmin && !hasAnySettingPerm) return null;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted'
              )}
            >
              {isActive && (
                <div className={cn(
                  'nav-active-bar',
                  'start-0 rounded-e-[4px]'
                )} />
              )}
              <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && item.colorActive)} />
              <span className="font-semibold text-base">{t(item.labelKey)}</span>
              {item.labelKey === 'nav.cafeteria' && <LowStockBadge />}
              {isActive && (
                <ChevronRight className={cn(
                  'w-3 h-3 ms-auto text-blue-400/60',
                  isRTL && 'rotate-180'
                )} />
              )}
            </Link>
          );
        })}

        {/* Super Admin Dashboard Link */}
        {user?.role === 'SUPER_ADMIN' && (
          <Link
            href="/super-admin/dashboard"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative mt-4 bg-yellow-500/10 border border-yellow-500/20',
              pathname.startsWith('/super-admin') ? 'text-yellow-400' : 'text-yellow-500/80 hover:text-yellow-400 hover:bg-yellow-500/20'
            )}
          >
            <ShieldCheck className="w-[18px] h-[18px] shrink-0" />
            <span className="font-bold text-base">{isRTL ? 'لوحة تحكم المنصة' : 'Platform Control'}</span>
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-border space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
          <span className="text-base font-semibold">{theme === 'dark' ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode')}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <Globe className="w-[18px] h-[18px] shrink-0" />
          <span className="text-base font-semibold">{t('common.language')}</span>
          <span className={cn(
            'ms-auto badge badge-blue text-[9px]',
            lang === 'ar' ? '' : ''
          )}>
            {lang === 'ar' ? 'AR' : 'EN'}
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-muted-foreground">{user?.username || 'Guest'}</p>
            <p className="text-xs text-muted-foreground">{t('nav.role')}: {user?.role || 'User'}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className="text-base font-semibold">{t('nav.signOut')}</span>
        </button>
      </div>
    </aside>
    </>
  );
};
