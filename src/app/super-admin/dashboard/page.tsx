"use client";

import React, { useEffect, useState } from 'react';
import { Users, CreditCard, Clock, CheckCircle2, XCircle, Search, RefreshCw, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getAllTenants, toggleTenantSubscription, updateTenantTrial } from '../../actions/super-admin.actions';

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      toast.success(currentStatus ? 'Subscription deactivated' : 'Subscription activated');
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

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
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
            Platform <span className="text-blue-500">Master Control</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage all cafe subscriptions and trials</p>
        </div>
        <button 
          onClick={fetchTenants}
          className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-all font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Tenants', value: stats.total, icon: Users, color: 'blue' },
          { label: 'Paid Subscriptions', value: stats.active, icon: CheckCircle2, color: 'emerald' },
          { label: 'On Free Trial', value: stats.trial, icon: Clock, color: 'amber' },
          { label: 'Expired Trials', value: stats.expired, icon: XCircle, color: 'rose' },
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

      {/* Search & Table */}
      <div className="glass-card rounded-2xl border bg-card/50 overflow-hidden">
        <div className="p-6 border-b flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tenant Information</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Usage</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {tenant.isSubscribed ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        new Date(tenant.trialEndDate) > new Date() ? (
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                            <Clock className="w-3 h-3" /> Trial ({Math.ceil((new Date(tenant.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold flex items-center gap-1.5 w-fit">
                            <XCircle className="w-3 h-3" /> Expired
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tenant._count.users} Users</span>
                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {tenant._count.devices} Devices</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <button
                        onClick={() => handleExtendTrial(tenant.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-xs font-bold transition-all"
                      >
                        Extend Trial
                      </button>
                      <button
                        onClick={() => handleToggleSubscription(tenant.id, tenant.isSubscribed)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          tenant.isSubscribed 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        }`}
                      >
                        {tenant.isSubscribed ? 'Disable' : 'Mark Paid'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredTenants.length === 0 && !isLoading && (
            <div className="p-12 text-center text-muted-foreground font-medium">
              No tenants found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
