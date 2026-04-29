"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/LanguageContext';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  metadata: any;
  tenantId: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
  } | null;
}

const actionLabels: Record<string, string> = {
  DELETE_ORDER: 'حذف طلب',
  ADD_ORDER_TO_SESSION: 'إضافة طلب',
  END_SESSION: 'إنهاء جلسة',
  TOGGLE_SESSION_MODE: 'تغيير نمط',
  TRANSFER_SESSION: 'نقل جلسة',
  EXTEND_SESSION_TIME: 'تمديد وقت',
  UPDATE_INVENTORY_ITEM: 'تحديث صنف',
  DELETE_INVENTORY_ITEM: 'حذف صنف',
  ADD_INVENTORY_ITEM: 'إضافة صنف',
  QUICK_SALE: 'بيع سريع',
  VOID_SALE: 'إلغاء بيع',
  ADD_EXPENSE: 'مصروف',
  ADD_INCOME: 'دخل',
  DELETE_FINANCIAL_TRANSACTION: 'حذف معاملة',
  CHANGE_SETTING: 'تغيير إعدادات',
  START_SHIFT: 'بدء وردية',
  END_SHIFT: 'إنهاء وردية',
};

export default function AuditClient() {
  const { t, isRTL } = useLang();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAction) params.set('action', selectedAction);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data);
      setFilteredLogs(data);
    } catch (error) {
      toast.error(isRTL ? 'فشل في تحميل السجلات' : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  const getActionLabel = (action: string) => {
    return actionLabels[action] || action;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="glass-card rounded-2xl p-6 border border-border/30">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Filter className="w-4 h-4 text-blue-400" strokeWidth={2} />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h3 className="text-sm font-bold tracking-wide uppercase text-blue-400">
              {isRTL ? 'تصفية السجلات' : 'Filter Logs'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'ابحث في سجلات التدقيق' : 'Search through audit logs'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={isRTL ? 'ابحث في السبب...' : 'Search reason...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-xl border border-border/50 bg-card/50 text-foreground text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className={`py-3 px-4 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all ${isRTL ? 'text-right' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <option value="">{isRTL ? 'كل العمليات' : 'All Actions'}</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Date Filters */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`py-3 px-4 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all ${isRTL ? 'text-right' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`py-3 px-4 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all ${isRTL ? 'text-right' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchLogs}
          className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <RefreshCcw className="w-4 h-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? 'لا توجد سجلات تدقيق' : 'No audit logs found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-card/30">
                  <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'التاريخ' : 'Date'}
                  </th>
                  <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'المستخدم' : 'User'}
                  </th>
                  <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'العملية' : 'Action'}
                  </th>
                  <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'النوع' : 'Entity'}
                  </th>
                  <th className={`p-4 font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'السبب / التبرير' : 'Reason / Justification'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/20 hover:bg-card/20 transition-all">
                    <td className={`p-4 text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{log.user?.username || 'System'}</div>
                          <div className="text-xs text-muted-foreground">{log.user?.role || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className={`p-4 text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                      {log.entityType} #{log.entityId.slice(0, 8)}
                    </td>
                    <td className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="max-w-xs">
                        <p className="text-foreground font-medium text-sm leading-relaxed">{log.reason}</p>
                        {log.metadata && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300">
                              {isRTL ? 'عرض التفاصيل' : 'View Details'}
                            </summary>
                            <pre className="mt-1 p-2 rounded-lg bg-card/50 border border-border/30 text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={`flex items-center gap-3 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
        <FileText className="w-3 h-3" />
        {isRTL ? `عرض ${filteredLogs.length} من أصل ${logs.length} سجل` : `Showing ${filteredLogs.length} of ${logs.length} logs`}
      </div>
    </div>
  );
}
