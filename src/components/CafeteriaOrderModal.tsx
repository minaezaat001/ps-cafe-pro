"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, Coffee, GlassWater, Utensils, Cookie, Pizza, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CafeteriaOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: () => void;
  session: any;
  inventory: any[];
  selectedItems: Record<string, number>;
  setSelectedItems: (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  selectedOrderCategory: string;
  setSelectedOrderCategory: (cat: string) => void;
  lastClickedItemId: string | null;
  setLastClickedItemId: (id: string | null) => void;
  isPending: boolean;
  isLight: boolean;
  t: (key: any) => string;
  isRTL: boolean;
}

export default function CafeteriaOrderModal({
  isOpen,
  onClose,
  onAddOrder,
  session,
  inventory,
  selectedItems,
  setSelectedItems,
  selectedOrderCategory,
  setSelectedOrderCategory,
  lastClickedItemId,
  setLastClickedItemId,
  isPending,
  isLight,
  t,
  isRTL,
}: CafeteriaOrderModalProps) {
  if (!isOpen) return null;

  const orderTotal = inventory.reduce((sum, item) => sum + (item.price * (selectedItems[item.id] || 0)), 0);
  const totalItems = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

  const categories = ['All', ...Array.from(new Set((inventory || []).filter(i => i.category).map(i => i.category)))];

  const getItemIconLocal = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('drink') || cat.includes('مشروب')) return <GlassWater className="w-5 h-5" />;
    if (cat.includes('food') || cat.includes('أكل') || cat.includes('مأكولات')) return <Utensils className="w-5 h-5" />;
    if (cat.includes('snack') || cat.includes('سناكس') || cat.includes('مقرمشات')) return <Cookie className="w-5 h-5" />;
    if (cat.includes('pizza') || cat.includes('بيتزا')) return <Pizza className="w-5 h-5" />;
    return <MoreHorizontal className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="glass-card w-full max-w-md p-6 sm:p-7 rounded-3xl relative z-[10000] border-t-[5px] overflow-hidden flex flex-col"
        style={{ borderTopColor: '#f59e0b', boxShadow: isLight ? '0 10px 40px -10px rgba(245,158,11,0.2)' : '0 20px 50px -12px rgba(245, 158, 11, 0.2)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Premium Header */}
        <div className={cn('flex justify-between items-center mb-6', isRTL && 'flex-row-reverse')}>
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #f59e0b20, #f9731610)',
              border: '1px solid #f59e0b30'
            }}>
              <Coffee className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground leading-tight">{t('nav.cafeteria')}</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{isRTL ? 'إضافة عناصر للفاتورة' : 'Add items to bill'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors" style={{
            background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)'
          }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2 -mx-2 px-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedOrderCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-2xl text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                selectedOrderCategory === cat
                  ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-card border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
              )}
            >
              {cat === 'All' ? (isRTL ? 'الكل' : 'All') : cat}
            </button>
          ))}
        </div>

        {/* Items Grid (POS Style) */}
        <div className="max-h-[50vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6 pr-1.5 scrollbar-hide content-start pt-1">
          {(inventory || [])
            .filter(item => selectedOrderCategory === 'All' || item.category === selectedOrderCategory)
            .map((item) => {
              const qty = selectedItems[item.id] || 0;
              const isSelected = qty > 0;
              const isFlashing = lastClickedItemId === item.id;

              return (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, qty + 1) }));
                    setLastClickedItemId(item.id);
                    setTimeout(() => setLastClickedItemId(null), 400);
                  }}
                  className={cn(
                    "relative flex flex-col p-3.5 rounded-[20px] transition-all duration-300 cursor-pointer active:scale-[0.97] overflow-hidden group",
                    isSelected 
                      ? (isLight ? "bg-amber-500/10 border border-amber-500/50 shadow-md" : "bg-amber-500/10 border border-amber-500/50")
                      : "bg-card border border-border hover:border-amber-500/30 hover:bg-card/50 shadow-sm",
                    isFlashing && "animate-flash-amber"
                  )}
                >
                  {/* Top Section: Avatar & Stock/Price */}
                  <div className={cn("flex justify-between items-start mb-3", isRTL && "flex-row-reverse")}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-black shrink-0 transition-colors uppercase shadow-sm",
                      isSelected
                        ? "bg-amber-500 text-white shadow-amber-500/20"
                        : (isLight ? "bg-slate-100 text-slate-400" : "bg-white/5 text-white/40")
                    )}>
                      {getItemIconLocal(item.category)}
                    </div>
                    <div className={cn("flex flex-col", isRTL ? 'items-start' : 'items-end')}>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded text-white tracking-widest uppercase mb-1",
                        item.stock > 10 ? "bg-emerald-500/80" : "bg-rose-500/80"
                      )}>
                        {item.stock} left
                      </span>
                      <span className="font-mono text-[13px] font-black text-foreground leading-none">
                        {item.price}<span className="text-[9px] text-muted-foreground ml-0.5" style={{ marginInlineStart: '2px' }}>EGP</span>
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className={cn("mb-4 min-h-[36px]", isRTL ? 'text-right' : 'text-left')}>
                    <h4 className={cn("font-bold text-sm leading-tight line-clamp-2 transition-colors", isSelected ? "text-amber-500 dark:text-amber-400" : "text-foreground")}>
                      {item.name}
                    </h4>
                  </div>

                  {/* Stepper */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="mt-auto flex items-center justify-between p-1 rounded-xl shrink-0" 
                    style={{
                      background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.03)',
                      border: isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <button onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg transition-all",
                        qty > 0 
                          ? "bg-background text-foreground shadow-sm hover:text-rose-500 hover:bg-rose-500/10" 
                          : "opacity-30 cursor-not-allowed text-muted-foreground"
                      )}>
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={item.stock}
                      value={qty === 0 ? '' : qty}
                      placeholder="0"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-') {
                          setSelectedItems(prev => ({ ...prev, [item.id]: 0 }));
                          return;
                        }
                        const num = parseInt(val);
                        if (!isNaN(num)) {
                          setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, Math.max(0, num)) }));
                        }
                      }}
                      className={cn(
                        "w-10 text-center font-mono font-black text-[15px] bg-transparent border-none outline-none transition-colors",
                        qty > 0 ? "text-amber-500" : "text-foreground"
                      )}
                      style={{ MozAppearance: 'textfield' } as any}
                    />
                    <button onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: Math.min(item.stock, qty + 1) }))}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg transition-all",
                        qty < item.stock 
                          ? "bg-background text-foreground shadow-sm hover:text-emerald-500 hover:bg-emerald-500/10" 
                          : "opacity-30 cursor-not-allowed text-muted-foreground"
                      )}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Total & Action */}
        <div className="pt-5 border-t border-dashed border-border mt-auto">
          <div className="space-y-4">
            {orderTotal > 0 && (
              <div className={cn("flex justify-between items-end px-1", isRTL && "flex-row-reverse")}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('device.grandTotal') || 'Total'}</p>
                  <p className="text-sm font-bold text-foreground">{totalItems} {isRTL ? 'عناصر' : 'Items'}</p>
                </div>
                <div className={cn("flex items-end gap-1.5", isRTL && "flex-row-reverse")}>
                  <span className="text-2xl sm:text-3xl font-black text-amber-500 leading-none">{orderTotal}</span>
                  <span className="text-xs font-bold text-muted-foreground pb-1">EGP</span>
                </div>
              </div>
            )}
            
            <button disabled={isPending || orderTotal === 0} onClick={onAddOrder}
              className="group relative w-full overflow-hidden rounded-2xl p-[2px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:opacity-50"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 px-8 font-black text-white shadow-lg">
                {isPending ? t('device.adding') : (
                  <>
                    <Coffee className="w-5 h-5" />
                    <span>{t('device.addToSessionBill')}</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
