"use client";

import React, { useState } from 'react';
import { Coffee, Search, ShoppingCart, Plus, Minus, Trash2, AlertTriangle, Package } from 'lucide-react';
import { processQuickSale } from '../actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { useKeyPress } from '@/lib/useKeyPress';
import Link from 'next/link';

interface InventoryItem { id: string; name: string; category: string; price: number; stock: number; }
interface CartItem extends InventoryItem { quantity: number; }

export default function CafetriaClient({ inventory, activeShift }: { inventory: InventoryItem[]; activeShift?: any }) {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, setIsPending] = useState(false);

  useKeyPress('Enter', () => {
    if (isPending || cart.length === 0) return;
    handleCompleteSale();
  }, cart.length > 0);

  const filteredItems = inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const addToCart = (item: InventoryItem) => {
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح وردية الكاشير أولاً للبدء في طلبات الكافيتريا!" : "Active shift required to place orders!");
      return;
    }
    if (item.stock <= 0) { toast.error('Item out of stock!'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) { toast.warning('Cannot add more than available stock'); return prev; }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQuantity = (id: string, delta: number) => setCart(prev => prev.map(i => {
    if (i.id === id) {
      const newQty = Math.max(1, i.quantity + delta);
      if (newQty > i.stock && delta > 0) { toast.warning('Stock limit reached!'); return i; }
      return { ...i, quantity: newQty };
    }
    return i;
  }));

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCompleteSale = async () => {
    if (!activeShift) {
      toast.error(isRTL ? "يجب فتح الوردية أولاً!" : "Active shift required!");
      return;
    }
    if (cart.length === 0) return;
    setIsPending(true);
    try {
      await processQuickSale(cart.map(i => ({ itemId: i.id, quantity: i.quantity })));
      router.refresh();
      toast.success('Sale completed! 🎉');
      setCart([]);
    } catch { toast.error('Failed to process sale'); }
    finally { setIsPending(false); }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={isRTL ? 'text-right' : ''}>
        <h2 className="text-2xl font-black text-foreground mb-1">
          {t('cafeteria.title')} <span className="text-amber-400">{t('cafeteria.titleAccent')}</span>
        </h2>
        <p className="text-muted-foreground text-sm">{t('cafeteria.subtitle')}</p>
      </div>

      {!activeShift && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-red-400 font-bold">{isRTL ? 'لا توجد وردية مفتوحة!' : 'No Active Shift!'}</h3>
              <p className="text-xs text-red-400/80 mt-0.5">{isRTL ? 'أنت بحاجة لفتح وردية الكاشير الآن لتتمكن من المبيعات.' : 'You must log a shift to process cafeteria orders.'}</p>
            </div>
          </div>
          <Link href="/shift" className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors whitespace-nowrap text-sm h-fit">
            {isRTL ? 'فتح وردية جديدة' : 'Open Current Shift'}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Products */}
        <div className="xl:col-span-2 space-y-5">
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0 ms-1" />
            <input type="text" placeholder={t('cafeteria.search')} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 opacity-20 mb-3" />
                <p className="font-bold text-sm">{isRTL ? 'لا توجد عناصر متاحة' : 'No items available'}</p>
              </div>
            ) : filteredItems.map(item => (
              <button key={item.id} disabled={item.stock <= 0} onClick={() => addToCart(item)}
                className={`glass-card p-4 rounded-xl border border-border hover:border-amber-500/30 transition-all text-left flex flex-col gap-2 group relative ${item.stock <= 0 ? 'opacity-40' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Coffee className="w-5 h-5 text-amber-400" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="text-xs font-bold truncate text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.price} EGP</p>
                </div>
                <div className={cn(
                  'absolute top-2 px-1.5 py-0.5 rounded-full bg-card text-[9px] font-bold text-muted-foreground',
                  isRTL ? 'left-2' : 'right-2'
                )}>
                  {item.stock} {t('cafeteria.left')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[500px] relative overflow-hidden"
          style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/2"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent)' }} />

          <h3 className={cn('text-base font-black mb-5 flex items-center gap-2 text-foreground', isRTL && 'flex-row-reverse')}>
            <ShoppingCart className="w-5 h-5 text-amber-400" /> {t('cafeteria.activeBill')}
          </h3>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 opacity-20">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-foreground" />
                <p className="text-sm font-bold text-foreground">{t('cafeteria.cartEmpty')}</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                    className={cn('flex items-center gap-3 p-3 rounded-xl bg-card border border-border', isRTL && 'flex-row-reverse')}>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold truncate text-foreground', isRTL && 'text-right')}>{item.name}</p>
                      <p className={cn('text-xs text-muted-foreground', isRTL && 'text-right')}>{item.price} EGP</p>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-lg px-1 py-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-muted-foreground hover:text-foreground transition"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-bold min-w-[20px] text-center text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-muted-foreground hover:text-amber-400 transition"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="pt-5 border-t border-border space-y-4 mt-auto">
            <div className={cn('flex justify-between items-end', isRTL && 'flex-row-reverse')}>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t('cafeteria.grandTotal')}</span>
              <span className="text-3xl font-black text-foreground">{total.toFixed(2)} <span className="text-base">EGP</span></span>
            </div>
            <button disabled={cart.length === 0 || isPending} onClick={handleCompleteSale}
              className="w-full py-3.5 rounded-xl font-black text-white tracking-wide transition hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              {isPending ? t('cafeteria.processing') : t('cafeteria.completeSale')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }
