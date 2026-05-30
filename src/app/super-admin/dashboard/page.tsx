"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Users, CreditCard, Clock, CheckCircle2, XCircle, Search, RefreshCw, Crown, Key, Trash2, HeartPulse, Activity, AlertTriangle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getAllTenants, toggleTenantSubscription, updateTenantTrial, deleteTenant, impersonateTenant, getGlobalSystemStats, type GlobalSystemStats } from '../../actions/super-admin.actions';
import { createAnnouncement } from '../../actions/announcement.actions';
import { useLang } from '@/lib/LanguageContext';

export default function SuperAdminDashboard() {
  const { t, isRTL } = useLang();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [systemStats, setSystemStats] = useState<GlobalSystemStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('INFO');
  const [broadcastTenantId, setBroadcastTenantId] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const data = await getAllTenants();
      setTenants(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleToggleSubscription = async (id: string, currentStatus: boolean) => {
    try {
      await toggleTenantSubscription(id, !currentStatus);
      toast.success(currentStatus ? t('superAdmin.deactivate') : t('superAdmin.markPaid'));
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExtendTrial = async (id: string) => {
    try {
      await updateTenantTrial(id, 7); // Extend by 7 days
      toast.success('Trial extended by 7 days');
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImpersonate = async (id: string, name: string) => {
    try {
      await impersonateTenant(id);
      // redirect happens server-side
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    setSending(true);
    try {
      await createAnnouncement(broadcastMsg, broadcastType, broadcastTenantId || undefined);
      toast.success(broadcastTenantId ? 'Announcement sent to tenant' : 'Announcement sent to all users');
      setBroadcastMsg('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`${t('superAdmin.deleteConfirm')} "${name}"? ${t('superAdmin.deleteConfirmDesc')}`)) return;
    
    try {
      await deleteTenant(id);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchSystemStats = useCallback(async () => {
    try {
      const data = await getGlobalSystemStats();
      setSystemStats(data);
    } catch {
      // Silently fail on health poll errors
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 60_000);
    return () => clearInterval(interval);
  }, [fetchSystemStats]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.phone && t.phone.includes(searchTerm))
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.isSubscribed).length,
    trial: tenants.filter(t => !t.isSubscribed && new Date(t.trialEndDate) > new Date()).length,
    expired: tenants.filter(t => !t.isSubscribed && new Date(t.trialEndDate) < new Date()).length,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            {t('superAdmin.title')} <span className="text-blue-500">{t('superAdmin.titleAccent')}</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">{t('superAdmin.subtitle')}</p>
        </div>
        <button 
          onClick={fetchTenants}
          className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-all font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('superAdmin.refresh')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: t('superAdmin.totalTenants'), value: stats.total, icon: Users, color: 'blue' },
          { label: t('superAdmin.paidSubscriptions'), value: stats.active, icon: CheckCircle2, color: 'emerald' },
          { label: t('superAdmin.freeTrial'), value: stats.trial, icon: Clock, color: 'amber' },
          { label: t('superAdmin.expiredTrials'), value: stats.expired, icon: XCircle, color: 'rose' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="glass-card p-6 rounded-2xl border bg-card/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ System Health ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-foreground">
            {t('superAdmin.systemHealth')} <span className="text-emerald-400">{t('superAdmin.healthAccent')}</span>
          </h2>
          {healthLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>

        {/* Health Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[
            {
              label: t('superAdmin.activeSessions'),
              value: systemStats?.activeSessions ?? '—',
              icon: Activity,
              color: 'blue',
            },
            {
              label: t('superAdmin.todayRevenue'),
              value: systemStats ? `${formatCurrency(systemStats.todayRevenue)}` : '—',
              icon: CreditCard,
              color: 'emerald',
            },
            {
              label: t('superAdmin.openShifts'),
              value: systemStats?.openShiftCount ?? '—',
              icon: Clock,
              color: 'violet',
            },
            {
              label: t('superAdmin.overdueShifts'),
              value: systemStats?.overdueShifts.length ?? '—',
              icon: AlertTriangle,
              color: systemStats && systemStats.overdueShifts.length > 0 ? 'rose' : 'amber',
              pulse: systemStats && systemStats.overdueShifts.length > 0,
            },
            {
              label: t('superAdmin.tenantHealth'),
              value: systemStats ? `${systemStats.subscribedTenants}/${systemStats.totalTenants}` : '—',
              sub: systemStats ? `${systemStats.staleTenants} ${t('superAdmin.stale')}` : '',
              icon: CheckCircle2,
              color:
                systemStats && systemStats.staleTenants > 0
                  ? 'rose'
                  : systemStats && systemStats.subscribedTenants === systemStats.totalTenants
                  ? 'emerald'
                  : 'amber',
            },
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              key={stat.label}
              className={`glass-card p-5 rounded-2xl border bg-card/50 ${stat.pulse ? 'animate-pulse-glow' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-black mt-1 text-foreground tabular-nums">{stat.value}</h3>
                  {stat.sub && (
                    <p className="text-[11px] font-bold text-muted-foreground/70 mt-0.5">{stat.sub}</p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 bg-${stat.color}-500/10 text-${stat.color}-500`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Critical Alerts Table */}
        {systemStats && systemStats.overdueShifts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl border border-rose-500/20 bg-card/50 overflow-hidden"
          >
            <div className="p-5 border-b border-rose-500/10 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-rose-500/15">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-rose-300">
                  {t('superAdmin.criticalAlert')}{systemStats.overdueShifts.length > 1 ? 's' : ''}
                </h3>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {systemStats.overdueShifts.length} {t('superAdmin.overdueDesc')}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-rose-500/5">
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tenant</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opened By</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opened At</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duration</th>
                    <th className="px-5 py-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-500/5">
                  {systemStats.overdueShifts.map((shift) => (
                    <tr key={shift.shiftId} className="hover:bg-rose-500/5 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm text-foreground">{shift.tenantName}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-muted-foreground">{shift.openedBy}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {format(new Date(shift.openedAt), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold">
                          {shift.hoursOpen}h
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleImpersonate(shift.tenantId, shift.tenantName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all text-xs font-bold"
                        >
                          <Key className="w-3 h-3" />
                          {t('superAdmin.loginAs')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══ Broadcast ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl border bg-card/50 overflow-hidden"
      >
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <Megaphone className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-sm text-foreground">{t('superAdmin.broadcastTitle')}</h3>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t('superAdmin.broadcastDesc')}
            </p>
          </div>
        </div>
        <form onSubmit={handleBroadcast} className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder={t('superAdmin.broadcastPlaceholder')}
              maxLength={500}
              className="flex-1 px-4 py-3 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium placeholder:text-muted-foreground/40"
            />
            <select
              value={broadcastTenantId}
              onChange={(e) => setBroadcastTenantId(e.target.value)}
              className="px-4 py-3 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-foreground appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="">{t('superAdmin.allTenants')}</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
            <select
              value={broadcastType}
              onChange={(e) => setBroadcastType(e.target.value)}
              className="px-4 py-3 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-foreground appearance-none cursor-pointer"
            >
              <option value="INFO">ℹ INFO</option>
              <option value="WARNING">⚠ WARNING</option>
              <option value="UPDATE">✦ UPDATE</option>
            </select>
            <button
              type="submit"
              disabled={sending || !broadcastMsg.trim()}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-all disabled:opacity-40 shrink-0"
            >
              {sending ? t('superAdmin.sending') : t('superAdmin.broadcastBtn')}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Search & Table */}
      <div className="glass-card rounded-2xl border bg-card/50 overflow-hidden">
        <div className="p-6 border-b flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('superAdmin.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('superAdmin.tenantInfo')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('superAdmin.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('superAdmin.usage')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">{t('superAdmin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {filteredTenants.map((tenant) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={tenant.id} 
                    className="hover:bg-secondary/10 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">{tenant.email}</p>
                          {tenant.phone && <p className="text-xs text-muted-foreground/60 font-medium mt-0.5" dir="ltr">{tenant.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {tenant.isSubscribed ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> {t('superAdmin.activeStatus')}
                        </span>
                      ) : (
                        new Date(tenant.trialEndDate) > new Date() ? (
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                            <Clock className="w-3 h-3" /> {t('superAdmin.trialStatus')} ({Math.ceil((new Date(tenant.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}{t('superAdmin.daysLeft')})
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                            <XCircle className="w-3 h-3" /> {t('superAdmin.expiredStatus')}
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tenant._count.users} {t('superAdmin.users')}</span>
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {tenant._count.devices} {t('superAdmin.devices')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <button
                        onClick={() => handleImpersonate(tenant.id, tenant.name)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                        title={`${t('superAdmin.loginAsTitle')} ${tenant.name}`}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExtendTrial(tenant.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-xs font-bold transition-all"
                      >
                        {t('superAdmin.extendTrial')}
                      </button>
                      <button
                        onClick={() => handleToggleSubscription(tenant.id, tenant.isSubscribed)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          tenant.isSubscribed 
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                          : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                        }`}
                      >
                        {tenant.isSubscribed ? 'Deactivate' : 'Mark Paid'}
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all"
                        title={t('superAdmin.deleteAccount')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredTenants.length === 0 && !isLoading && (
            <div className="p-12 text-center text-muted-foreground font-medium">
              {t('superAdmin.noTenants')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
