"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Clock, Package, Filter, FileText, X, Eye, Download, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Lazy-load recharts — doesn't block initial page render ──
const AreaChart = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => ({ default: m.Area })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { calculateSessionTimeCost, getBillBreakdown } from '@/lib/billing';
import { usePrintSettings } from '@/lib/usePrintSettings';
import { printReceiptSilently } from '@/lib/printUtils';
import { useKeyPress } from '@/lib/useKeyPress';
import { voidSale } from '../actions';


function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v);
}

function isManualFinanceTx(t: { type: string }) {
  return t.type === "INCOME" || t.type === "EXPENSE";
}

interface ReportsClientProps { 
  data: { sessions: any[]; sales: any[]; transactions: any[]; shifts: any[] };
  performance: {
    today: { value: number; trend: number };
    month: { value: number; trend: number };
    cafeteriaToday: number;
    gamingToday: number;
  } | null;
}

export default function ReportsClient({ data, performance }: ReportsClientProps) {
  const { t, isRTL } = useLang();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { settings: printSettings } = usePrintSettings();
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("ALL");


  // Escape → close invoice modal
  useKeyPress('Escape', () => setSelectedInvoice(null), !!selectedInvoice);

  const [dateRange, setDateRange] = useState({
    start: searchParams.get('start') || format(new Date(), 'yyyy-MM-dd'),
    end: searchParams.get('end') || format(new Date(), 'yyyy-MM-dd'),
  });

  const handleFilter = () => router.push(`/reports?start=${dateRange.start}&end=${dateRange.end}`);

  const filteredData = useMemo(() => {
    if (selectedShiftId === "ALL") return data;
    return {
      sessions: data.sessions.filter(s => s.shiftId === selectedShiftId),
      sales: data.sales.filter(s => s.shiftId === selectedShiftId),
      transactions: data.transactions.filter(t => t.shiftId === selectedShiftId),
      shifts: data.shifts
    };
  }, [data, selectedShiftId]);


  // ── xlsx loaded on-demand only when user clicks Export ──
  const exportToExcel = useCallback(async () => {
    // Dynamic import: xlsx (~500KB) is NOT in the initial bundle
    const XLSX = (await import('xlsx')).default;

    // Collect Sessions Data
    const sessionsSheet = filteredData.sessions.map(s => {
      const breakdown = getBillBreakdown(s, s.device, new Date(s.endTime || new Date()).getTime());
      const cafeteriaCost = s.orders.reduce((acc: any, o: any) => acc + num(o.priceAtTime) * o.quantity, 0);
      return {
        'Invoice ID': s.id,
        'Device': s.device.number,
        'Staff': s.endedByUser?.username || s.user?.username || '---',
        'Start Time': format(new Date(s.startTime), 'yyyy-MM-dd HH:mm'),
        'End Time': s.endTime ? format(new Date(s.endTime), 'yyyy-MM-dd HH:mm') : 'Active',
        'Gaming Cost (EGP)': breakdown.gaming.toFixed(2),
        'Cafeteria Cost (EGP)': cafeteriaCost.toFixed(2),
        'Total Cost (EGP)': (breakdown.gaming + cafeteriaCost).toFixed(2)
      };
    });

    // Collect Cafeteria Sales
    const salesSheet = filteredData.sales.map(s => ({
      'Sale ID': s.id,
      'Staff': s.user?.username || '---',
      'Date': format(new Date(s.createdAt), 'yyyy-MM-dd HH:mm'),
      'Items': s.items.map((i: any) => `${i.inventoryItem?.name || 'Item'} x${i.quantity}`).join(', '),
      'Total Amount (EGP)': num(s.totalAmount).toFixed(2)
    }));

    // Collect Financial Transactions
    const financeSheet = filteredData.transactions.filter(isManualFinanceTx).map(t => ({
      'Transaction ID': t.id,
      'Type': t.type === 'INCOME' ? 'Income' : 'Expense',
      'Amount (EGP)': (t.type === 'EXPENSE' ? -num(t.amount) : num(t.amount)).toFixed(2),
      'Description': t.description,
      'Staff': t.user?.username || '---',
      'Date': format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm')
    }));

    // Aggregated Inventory Summary
    const inventoryMap = new Map();
    filteredData.sessions.forEach(s => {
      s.orders.forEach((o: any) => {
        const name = o.inventoryItem?.name || 'Item';
        const current = inventoryMap.get(name) || { qty: 0, total: 0 };
        current.qty += o.quantity;
        current.total += num(o.priceAtTime) * o.quantity;
        inventoryMap.set(name, current);
      });
    });
    filteredData.sales.forEach(s => {
      s.items.forEach((i: any) => {
        const name = i.inventoryItem?.name || 'Item';
        const current = inventoryMap.get(name) || { qty: 0, total: 0 };
        current.qty += i.quantity;
        current.total += num(i.priceAtTime) * i.quantity;
        inventoryMap.set(name, current);
      });
    });

    const inventorySummarySheet = Array.from(inventoryMap.entries()).map(([name, data]) => ({
      'Product Name': name,
      'Total Quantity Sold': data.qty,
      'Total Revenue (EGP)': data.total.toFixed(2)
    })).sort((a, b) => b['Total Quantity Sold'] - a['Total Quantity Sold']);

    const wb = XLSX.utils.book_new();

    if (sessionsSheet.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionsSheet), isRTL ? "الجلسات" : "Sessions");
    if (salesSheet.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesSheet), isRTL ? "مبيعات الكافيتريا" : "Cafeteria Sales");
    if (inventorySummarySheet.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventorySummarySheet), isRTL ? "ملخص المنتجات" : "Inventory Summary");
    if (financeSheet.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financeSheet), isRTL ? "الشئون المالية" : "Financials");

    if (sessionsSheet.length === 0 && salesSheet.length === 0 && financeSheet.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Message: "No Data Available" }]), "Empty");
    }

    XLSX.writeFile(wb, `Reports_${dateRange.start}_to_${dateRange.end}.xlsx`);
  }, [filteredData, dateRange, isRTL]);

  const stats = useMemo(() => {
    let gamingTimeRevenue = 0, cafeteriaRevenue = 0, totalHours = 0;
    filteredData.sessions.forEach(session => {
      const gamingCost = calculateSessionTimeCost(session, session.device);
      gamingTimeRevenue += gamingCost;
      
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : new Date();
      totalHours += (end.getTime() - start.getTime()) / 3600000;
      
      cafeteriaRevenue += session.orders.reduce((acc: number, o: any) => acc + num(o.priceAtTime) * o.quantity, 0);
    });

    filteredData.sales.forEach(sale => { cafeteriaRevenue += num(sale.totalAmount); });
    
    const income = filteredData.transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + num(t.amount), 0);
    const expenses = filteredData.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + num(t.amount), 0);
    const finalBalance = gamingTimeRevenue + cafeteriaRevenue + income - expenses;

    const trendMap = new Map();
    [...filteredData.sessions, ...filteredData.sales, ...filteredData.transactions.filter(isManualFinanceTx)].forEach(item => {
      const date = format(new Date(item.endTime || item.createdAt), 'MMM dd');
      let amount = 0;
      if (item.startTime) {
        amount = calculateSessionTimeCost(item, item.device) + 
                 item.orders.reduce((a: number, o: any) => a + num(o.priceAtTime) * o.quantity, 0);
      } else if (item.totalAmount !== undefined) { 
        amount = num(item.totalAmount); 
      } else if (item.amount !== undefined) {
        amount = item.type === 'INCOME' ? num(item.amount) : -num(item.amount);
      }
      trendMap.set(date, (trendMap.get(date) || 0) + amount);
    });
    const trendData = Array.from(trendMap.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    return { totalRevenue: finalBalance, gamingTimeRevenue, cafeteriaRevenue, income, expenses, totalHours, trendData };
  }, [filteredData]);

  const statCards = [
    { label: isRTL ? 'صافي اليوم' : 'Net Balance', value: `${stats.totalRevenue.toFixed(2)} EGP`, icon: DollarSign, color: 'text-emerald-400', glow: 'glow-green' },
    { label: isRTL ? 'إيراد الأجهزة' : 'Gaming Revenue', value: `${stats.gamingTimeRevenue.toFixed(2)} EGP`, icon: Clock, color: 'text-blue-400', glow: 'glow-blue' },
    { label: isRTL ? 'إيراد الكافيتريا' : 'Cafeteria Revenue', value: `${stats.cafeteriaRevenue.toFixed(2)} EGP`, icon: Package, color: 'text-amber-400', glow: 'glow-amber' },
    { label: isRTL ? 'مسحوبات' : 'Expenses', value: `-${stats.expenses.toFixed(2)} EGP`, icon: TrendingDown, color: 'text-rose-400', glow: 'glow-red' },
    { label: isRTL ? 'إيداعات' : 'Income', value: `+${stats.income.toFixed(2)} EGP`, icon: TrendingUp, color: 'text-blue-400', glow: 'glow-blue' },
  ];

  return (
    <div className="space-y-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={cn('flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8', isRTL && 'lg:flex-row-reverse')}>
        <div className={isRTL ? 'text-right' : ''}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-blue-500 rounded-full" />
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              {t('reports.title')} <span className="text-blue-500">{t('reports.titleAccent')}</span>
            </h2>
          </div>
          <p className="text-muted-foreground text-sm font-medium opacity-70">{t('reports.subtitle')}</p>
        </div>

        <div className={cn('w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-muted/30 p-3 rounded-2xl border border-border backdrop-blur-xl shadow-2xl', isRTL && 'sm:flex-row-reverse')}>
          <div className="flex flex-col gap-1.5 px-1 flex-1 sm:flex-none">
             <span className="text-[10px] font-black text-muted-foreground uppercase px-2">{isRTL ? 'من تاريخ' : 'From Date'}</span>
             <div className="flex items-center gap-3 px-4 py-2.5 bg-card rounded-xl border border-border focus-within:border-blue-500/50 transition-all">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <input type="date" value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-transparent border-none outline-none text-[13px] font-black text-foreground w-full cursor-pointer dark:[color-scheme:dark]" />
             </div>
          </div>

          <div className="flex flex-col gap-1.5 px-1 flex-1 sm:flex-none">
             <span className="text-[10px] font-black text-muted-foreground uppercase px-2">{isRTL ? 'تصفية بالوردية' : 'Filter by Shift'}</span>
             <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-xl border border-border focus-within:border-blue-500/50 transition-all">
                <Clock className="w-4 h-4 text-violet-400 shrink-0" />
                <select 
                  value={selectedShiftId} 
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] font-bold text-foreground w-full cursor-pointer dark:[color-scheme:dark] py-1"
                >
                  <option value="ALL">{isRTL ? 'الكل (جميع الورديات)' : 'All Shifts'}</option>
                  {data.shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.openedByUser?.username} - {format(new Date(shift.openedAt), 'HH:mm')} ({shift.status === 'OPEN' ? (isRTL ? 'مفتوحة' : 'Open') : (isRTL ? 'مغلقة' : 'Closed')})
                    </option>
                  ))}
                </select>
             </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-border" />

          <div className="flex flex-col gap-1.5 px-1 flex-1 sm:flex-none">
             <span className="text-[10px] font-black text-muted-foreground uppercase px-2">{isRTL ? 'إلى تاريخ' : 'To Date'}</span>
             <div className="flex items-center gap-3 px-4 py-2.5 bg-card rounded-xl border border-border focus-within:border-blue-500/50 transition-all">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <input type="date" value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-transparent border-none outline-none text-[13px] font-black text-foreground w-full cursor-pointer dark:[color-scheme:dark]" />
             </div>
          </div>

          <button onClick={handleFilter}
            className="group relative overflow-hidden flex items-center justify-center py-4 sm:px-6 bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            <Filter className="w-4 h-4" />
            <span className="ms-3">{isRTL ? 'تطبيق' : 'Apply'}</span>
          </button>
          
          <button onClick={exportToExcel}
            className="group relative overflow-hidden flex items-center justify-center py-4 sm:px-6 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
            <Download className="w-4 h-4" />
            <span className="ms-3">{isRTL ? 'تصدير كمستند إكسيل' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl relative overflow-hidden group">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', stat.glow)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-xl font-black text-foreground">{stat.value}</h3>
            <div className={cn('absolute -right-4 -bottom-4 w-16 h-16 blur-2xl rounded-full opacity-30', stat.glow)} />
          </div>
        ))}
      </div>


      {/* Invoice Table */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className={cn('p-6 border-b border-border flex justify-between items-center bg-card/30', isRTL && 'flex-row-reverse')}>
          <h3 className="text-base font-black text-foreground">
            {t('reports.recentInvoices')}
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-bold">{t('reports.invoiceId')}</th>
                <th className="px-6 py-4 font-bold">{t('reports.source')}</th>
                <th className="px-6 py-4 font-bold">{t('reports.dateTime')}</th>
                <th className="px-6 py-4 font-bold">{isRTL ? 'الموظف' : 'Staff'}</th>
                <th className="px-6 py-4 font-bold">{t('reports.grandTotal')}</th>
                <th className={cn('px-6 py-4 font-bold', isRTL ? 'text-left' : 'text-right')}>{t('reports.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...filteredData.sessions, ...filteredData.sales, ...filteredData.transactions.filter(isManualFinanceTx)]
                .sort((a, b) => new Date(b.endTime || b.createdAt).getTime() - new Date(a.endTime || a.createdAt).getTime())
                .map((item, i) => {
                  const isSession = !!item.startTime;
                  const isTransaction = item.type === 'INCOME' || item.type === 'EXPENSE';
                  const date = new Date(item.endTime || item.createdAt);
                  
                  let total = 0;
                  if (item.totalAmount !== undefined) total = num(item.totalAmount);
                  else if (item.amount !== undefined) total = num(item.amount);
                  else if (isSession) {
                    total = calculateSessionTimeCost(item, item.device) + 
                            item.orders.reduce((a: number, o: any) => a + num(o.priceAtTime) * o.quantity, 0);
                  }


                  const staffName = item.endedByUser?.username || item.user?.username || '---';

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-muted text-muted-foreground",
                            item.type === 'INCOME' && "text-emerald-400 bg-emerald-500/10",
                            item.type === 'EXPENSE' && "text-rose-400 bg-rose-500/10"
                          )}>
                            {isTransaction ? <DollarSign className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <span className="font-black text-sm text-foreground">
                            {isTransaction ? (item.type === 'INCOME' ? (isRTL ? 'إيداع' : 'INCOME') : (isRTL ? 'مسحوبات' : 'EXPENSE')) : `#INV-${i + 1}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                        {isSession ? `${t('reports.stationSource')}${item.device.number}` : (isTransaction ? item.description : t('reports.quickSale'))}
                      </td>
                      <td className="px-6 py-5 text-xs text-muted-foreground">{format(date, 'MMM dd, HH:mm')}</td>
                      <td className="px-6 py-5">
                          <span className="text-xs font-bold text-muted-foreground/80 lowercase">{staffName}</span>
                      </td>
                      <td className="px-6 py-5 font-mono font-bold text-sm">
                        <span className={cn(
                          item.type === 'EXPENSE' ? "text-rose-400" : "text-blue-400"
                        )}>
                          {item.type === 'EXPENSE' ? '-' : ''} {total.toFixed(2)} EGP
                        </span>
                      </td>
                      <td className={cn('px-6 py-5', isRTL ? 'text-left' : 'text-right')}>
                        <button onClick={() => setSelectedInvoice({ ...item, actualTotal: total })}
                          className="px-3 py-1.5 rounded-xl bg-muted hover:bg-blue-500 text-muted-foreground hover:text-white text-[10px] font-black tracking-wide transition-all inline-flex items-center gap-1.5">
                          <Eye className="w-3 h-3" /> {isTransaction ? (isRTL ? 'عرض التفاصيل' : 'View Details') : t('reports.viewInvoice')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setSelectedInvoice(null)} className="absolute inset-0 bg-black/75 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl relative z-10"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-7', isRTL && 'flex-row-reverse')}>
                <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                  <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400"><FileText className="w-5 h-5" /></div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <h2 className="text-lg font-black text-foreground">{t('reports.invoice')}</h2>
                    <p className="text-[10px] text-muted-foreground font-mono">#{selectedInvoice.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 mb-6">
                <div className={cn('flex justify-between text-xs pb-3 border-b border-border', isRTL && 'flex-row-reverse')}>
                  <span className="text-muted-foreground font-bold uppercase">{t('reports.source')}</span>
                  <span className="text-foreground font-black">
                    {selectedInvoice.startTime 
                      ? `${t('reports.stationSource')}${selectedInvoice.device.number}` 
                      : (selectedInvoice.type ? (isRTL ? (selectedInvoice.type === 'INCOME' ? 'إيداع' : 'مسحوبات') : selectedInvoice.type) : t('reports.quickSale'))}
                  </span>
                </div>
                <div className={cn('flex justify-between text-xs pb-3 border-b border-border', isRTL && 'flex-row-reverse')}>
                  <span className="text-muted-foreground font-bold uppercase">{t('reports.date')}</span>
                  <span className="text-foreground font-black">{format(new Date(selectedInvoice.endTime || selectedInvoice.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className={cn('flex justify-between text-xs pb-3 border-b border-border', isRTL && 'flex-row-reverse')}>
                  <span className="text-muted-foreground font-bold uppercase">{isRTL ? 'بواسطة الموظف' : 'By Staff'}</span>
                  <span className="text-blue-400 font-black lowercase">{selectedInvoice.endedByUser?.username || selectedInvoice.user?.username || '---'}</span>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t('reports.billingItems')}</p>
                  
                  {/* Financial Transaction Detail */}
                  {selectedInvoice.description && !selectedInvoice.startTime && (
                    <div className="p-3 bg-muted/50 rounded-xl border border-border">
                       <p className="text-xs text-foreground font-medium leading-relaxed italic opacity-80 decoration-blue-500/30">
                        {selectedInvoice.description}
                       </p>
                    </div>
                  )}

                  {/* Session Detail */}
                  {selectedInvoice.startTime && (() => {
                    const breakdown = getBillBreakdown(selectedInvoice, selectedInvoice.device, new Date(selectedInvoice.endTime || selectedInvoice.isActive).getTime());
                    if (breakdown.segments && breakdown.segments.length > 0) {
                      return breakdown.segments.map((seg: any, idx: number) => (
                        <div key={idx} className={cn('flex justify-between text-sm py-1', isRTL && 'flex-row-reverse')}>
                          <span className="text-muted-foreground">
                            {t('device.account')} {seg.deviceType} ({seg.mode === 'SINGLE' ? t('device.single') : t('device.multi')})
                          </span>
                          <span className="font-mono text-blue-400 font-bold">{seg.cost.toFixed(2)} EGP</span>
                        </div>
                      ));
                    }
                    return (
                      <>
                        {breakdown.single > 0 && (
                          <div className={cn('flex justify-between text-sm py-1', isRTL && 'flex-row-reverse')}>
                            <span className="text-muted-foreground">
                              {t('device.account')} {selectedInvoice.device.type} ({t('device.single')})
                            </span>
                            <span className="font-mono text-blue-400 font-bold">{breakdown.single.toFixed(2)} EGP</span>
                          </div>
                        )}
                        {breakdown.multi > 0 && (
                          <div className={cn('flex justify-between text-sm py-1', isRTL && 'flex-row-reverse')}>
                            <span className="text-muted-foreground">
                              {t('device.account')} {selectedInvoice.device.type} ({t('device.multi')})
                            </span>
                            <span className="font-mono text-blue-400 font-bold">{breakdown.multi.toFixed(2)} EGP</span>
                          </div>
                        )}
                        {breakdown.single === 0 && breakdown.multi === 0 && breakdown.gaming >= 0 && (
                          <div className={cn('flex justify-between text-sm py-1', isRTL && 'flex-row-reverse')}>
                            <span className="text-muted-foreground">
                              {t('device.account')} {selectedInvoice.device.type} ({selectedInvoice.isMulti ? t('device.multi') : t('device.single')})
                            </span>
                            <span className="font-mono text-blue-400 font-bold">{breakdown.gaming.toFixed(2)} EGP</span>
                          </div>
                        )}
                      </>
                    );
                  })()}


                  {/* Orders/Quick Sale Items */}
                  {(selectedInvoice.orders || selectedInvoice.items || []).map((o: any, i: number) => (
                    <div key={i} className={cn('flex justify-between text-sm py-1', isRTL && 'flex-row-reverse')}>
                      <span className="text-muted-foreground">{o.inventoryItem?.name || 'Item'} x{o.quantity}</span>
                      <span className="font-mono text-muted-foreground">{(o.priceAtTime * o.quantity).toFixed(2)} EGP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 border-t-2 border-dashed border-border mb-5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{t('reports.grandTotal')}</p>
                <span className={cn(
                  "text-4xl font-black tracking-tighter",
                  selectedInvoice.type === 'EXPENSE' ? "text-rose-400" : "text-foreground"
                )}>
                  {selectedInvoice.type === 'EXPENSE' ? '-' : ''} {selectedInvoice.actualTotal.toFixed(2)} <span className="text-base text-blue-400">EGP</span>
                </span>
              </div>

              <div className={cn('flex gap-3', isRTL && 'flex-row-reverse')}>
                {printSettings.enabled && selectedInvoice.startTime && (
                  <button
                    disabled={isPrinting}
                    onClick={async () => {
                      setIsPrinting(true);
                      try {
                        await printReceiptSilently(selectedInvoice.id, printSettings);
                      } catch {
                        window.open(`/print/invoice/${selectedInvoice.id}?source=report&size=${printSettings.paperSize}`, '_blank');
                      } finally {
                        setIsPrinting(false);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {isPrinting
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Printer className="w-4 h-4" />}
                    {isRTL ? 'طباعة الفاتورة' : 'Print Invoice'}
                  </button>
                )}
                <button onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-3 rounded-xl bg-muted border border-border hover:bg-muted text-muted-foreground font-bold transition-all">
                  {t('reports.closeInvoice')}
                </button>
              </div>

              {/* Void Sale Option for Quick Sales (Only for Admin or Manager) */}
              {!selectedInvoice.startTime && !selectedInvoice.type && !selectedInvoice.isDeleted && (
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={async () => {
                      if (!window.confirm(isRTL ? 'هل أنت متأكد من إلغاء هذه العملية وإرجاع البضاعة للمخزن؟' : 'Are you sure you want to void this sale and restore stock?')) return;
                      try {
                        await voidSale(selectedInvoice.id);
                        setSelectedInvoice(null);
                        router.refresh();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black transition-all flex items-center justify-center gap-2 text-xs uppercase"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isRTL ? 'إلغاء العملية وإرجاع المخزن' : 'Void Sale & Restore Stock'}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-60">
                    {isRTL ? 'سيتم حذف المعاملة من التقارير وإضافة الكميات للمخزن تلقائياً' : 'This will remove the sale from reports and restore stock automatically'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
