"use client";

import React, { useState } from 'react';
import { Gamepad2, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { login } from '../actions';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useLang();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(username, password);
      toast.success(t('login.welcomeBack'));
      
      if (user.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]" style={{ background: isLight ? '#f0f4f8' : '#0f1117' }}>
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 60%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-card w-full max-w-sm p-8 rounded-2xl relative"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mb-5"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Gamepad2 className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1 text-foreground">
            {t('login.title')} <span className="text-blue-400">{t('login.titleAccent')}</span>
          </h1>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">{t('login.sectorAuth')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block px-1">
              {t('login.identifier')}
            </label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all"
              style={{ borderColor: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.08)' }}>
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.enterUsername')}
                className="bg-transparent border-none outline-none w-full text-sm font-medium text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block px-1">
              {t('login.encryptionKey')}
            </label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all"
              style={{ borderColor: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.08)' }}>
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-none outline-none w-full text-sm font-medium text-foreground"
                required
              />
            </div>
          </div>

          <button
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-bold tracking-wide text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            {isLoading ? t('login.establishing') : t('login.initiateLogin')}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-muted-foreground font-medium">
          {t('login.securityNote')}
        </p>
      </motion.div>
    </div>
  );
}
