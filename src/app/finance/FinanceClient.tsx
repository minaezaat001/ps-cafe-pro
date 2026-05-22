"use client";

import React, { useState, useTransition } from "react";
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  User as UserIcon,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { addFinancialTransaction, deleteFinancialTransaction } from "@/app/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useKeyPress } from "@/lib/useKeyPress";

export default function FinanceClient({ initialTransactions, user }: { initialTransactions: any[], user: any }) {
  const { t, isRTL } = useLang();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const isAdmin = user.role === 'ADMIN';

  // ── Keyboard Shortcuts ─────────────────────────────────
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (showAddModal) setShowAddModal(false);
  }, showAddModal);

  useKeyPress('Enter', () => {
    if (isPending) return;
    if (showAddModal && amount && description) handleAdd();
  }, showAddModal);

  const calculateSummary = () => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const { income, expenses, balance } = calculateSummary();

  const handleAdd = () => {
    if (!amount || !description) return;
    startTransition(async () => {
      try {
        await addFinancialTransaction({
          type,
          amount: parseFloat(amount),
          description,
          reason: description, // Use description as reason for now
        });
        toast.success(isRTL ? "تمت العملية بنجاح" : "Transaction added");
        setShowAddModal(false);
        setAmount("");
        setDescription("");
        window.location.reload(); // Quick refresh
      } catch (err: any) {
        toast.error(err.message || (isRTL ? "فشل في تسجيل العملية" : "Failed to add transaction"));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) return;
    startTransition(async () => {
      try {
        await deleteFinancialTransaction(id);
        toast.success(isRTL ? "تم الحذف" : "Deleted");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isRTL ? "الخزينة والمالية" : "Finance & Treasury"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL ? "إدارة المسحوبات والإيداعات اليومية" : "Manage daily withdrawals and deposits"}
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {isRTL ? "تسجيل عملية جديدة" : "New Transaction"}
        </button>
      </div>

      {/* ── Stats Summary ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border-t-4 border-emerald-500/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-12 h-12 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isRTL ? "إجمالي الإيداعات" : "TOTAL INCOME"}</p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">+{income.toFixed(2)} <span className="text-sm">EGP</span></h3>
        </div>

        <div className="glass-card p-6 rounded-3xl border-t-4 border-rose-500/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-12 h-12 text-rose-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isRTL ? "إجمالي المسحوبات" : "TOTAL EXPENSES"}</p>
          <h3 className="text-2xl font-black text-rose-400 font-mono">-{expenses.toFixed(2)} <span className="text-sm">EGP</span></h3>
        </div>

        <div className="glass-card p-6 rounded-3xl border-t-4 border-blue-500/50 relative overflow-hidden group bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isRTL ? "صافي الخزينة" : "TREASURY BALANCE"}</p>
          <h3 className={cn("text-2xl font-black font-mono", balance >= 0 ? "text-blue-400" : "text-rose-400")}>
            {balance.toFixed(2)} <span className="text-sm">EGP</span>
          </h3>
        </div>
      </div>

      {/* ── Transactions History ─────────────── */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl border border-border">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/50">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            {isRTL ? "سجل العمليات" : "Recent Transactions"}
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder={isRTL ? "بحث..." : "Search..."}
              className={cn(
                "w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 outline-none focus:border-blue-500/50 transition-all text-sm",
                isRTL && "pl-4 pr-10 text-right"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-4 text-start">{isRTL ? "التاريخ" : "DATE"}</th>
                <th className="px-6 py-4 text-start">{isRTL ? "البيان" : "DESCRIPTION"}</th>
                <th className="px-6 py-4 text-start">{isRTL ? "المستخدم" : "STAFF"}</th>
                <th className="px-6 py-4 text-center">{isRTL ? "المبلغ" : "AMOUNT"}</th>
                {isAdmin && <th className="px-6 py-4 text-end"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {filtered.map((tx) => (
                  <motion.tr 
                    key={tx.id}
                    title={tx.description}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">
                      {tx.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                          {tx.user.username[0].toUpperCase()}
                        </div>
                        {tx.user.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase",
                        tx.type === 'INCOME' 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {tx.type === 'INCOME' ? '+' : '-'} {tx.amount.toFixed(2)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-end">
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 text-rose-400/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground uppercase tracking-widest text-sm italic opacity-50">
                    {isRTL ? "لا توجد سجلات" : "No records found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Modal ───────────────────────── */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} onClick={() => setShowAddModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="relative w-full max-w-sm bg-background border border-border p-7 rounded-3xl shadow-2xl glass-card text-center"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-center mb-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                type === 'INCOME' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              )}>
                {type === 'INCOME' ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
              </div>
            </div>
            
            <h2 className="text-xl font-black text-foreground mb-6">
              {isRTL ? "تسجيل عملية جديدة" : "New Transaction"}
            </h2>

            <div className="space-y-4 text-start">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-2xl border border-border">
                <button 
                  onClick={() => setType('INCOME')}
                  className={cn(
                    "py-2 rounded-xl text-xs font-black transition-all",
                    type === 'INCOME' ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {isRTL ? "إيداع" : "INCOME"}
                </button>
                <button 
                  onClick={() => setType('EXPENSE')}
                  className={cn(
                    "py-2 rounded-xl text-xs font-black transition-all",
                    type === 'EXPENSE' ? "bg-rose-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {isRTL ? "مسحوبات" : "EXPENSE"}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">
                  {isRTL ? "المبلغ (ج.م)" : "AMOUNT (EGP)"}
                </label>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 font-mono font-bold text-lg"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1">
                  {isRTL ? "البيان / الوصف" : "DESCRIPTION / NOTE"}
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 text-sm font-bold min-h-[80px]"
                  placeholder={isRTL ? "مثلاً: شراء ورق، دفع كهرباء..." : "e.g. Electricity bill, cleaning..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="py-3.5 rounded-2xl font-black text-xs bg-muted hover:bg-muted/80 text-foreground transition-all uppercase tracking-widest"
                >
                  {t('device.back')}
                </button>
                <button 
                  disabled={isPending || !amount || !description}
                  onClick={handleAdd}
                  className={cn(
                    "py-3.5 rounded-2xl font-black text-xs text-white shadow-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30",
                    type === 'INCOME' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-rose-600 shadow-rose-500/20"
                  )}
                >
                  {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('settings.confirm')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
