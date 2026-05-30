"use client";

import React, { useState } from 'react';
import { Package, Plus, Search, Trash2, Edit, X, History } from 'lucide-react';
import { addInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/app/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { useKeyPress } from '@/lib/useKeyPress';
import JustificationModal from '@/components/JustificationModal';
import PriceHistoryModal from '@/components/PriceHistoryModal';

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }

interface InventoryItem { id: string; name: string; category: string; price: number; stock: number; }

export default function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, itemId: string, itemName: string}>({show: false, itemId: '', itemName: ''});
  const [priceHistoryFor, setPriceHistoryFor] = useState<{ id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [formData, setFormData] = useState({ name: '', category: 'Drinks', price: 15, stock: 50 });

  // ── Keyboard Shortcuts ─────────────────────────────────
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (showModal) setShowModal(false);
  }, showModal);

  // Note: Standard form submission handles Enter natively.

  const filteredItems = initialItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => { setEditingItem(null); setFormData({ name: '', category: 'Drinks', price: 15, stock: 50 }); setShowModal(true); };
  const handleOpenEdit = (item: InventoryItem) => { setEditingItem(item); setFormData({ name: item.name, category: item.category, price: item.price, stock: item.stock }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsPending(true);
    try {
      if (editingItem) { await updateInventoryItem(editingItem.id, formData); router.refresh(); toast.success('Item updated'); }
      else { await addInventoryItem(formData); router.refresh(); toast.success('Item added'); }
      setShowModal(false);
    } catch { toast.error('Failed to save item'); }
    finally { setIsPending(false); }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ show: true, itemId: id, itemName: name });
  };

  const handleDeleteConfirm = async (reason: string) => {
    setIsPending(true);
    try { 
      await deleteInventoryItem(deleteModal.itemId, reason); 
      router.refresh(); 
      toast.success('Item deleted'); 
    } catch { 
      toast.error('Failed to delete'); 
    } finally { 
      setIsPending(false); 
      setDeleteModal({ show: false, itemId: '', itemName: '' }); 
    }
  };

  const inputCls = "w-full bg-card border border-border rounded-xl py-3 px-4 outline-none text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 transition-colors";

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={cn('flex flex-col md:flex-row justify-between items-start md:items-center gap-4', isRTL && 'md:flex-row-reverse')}>
        <div>
          <h2 className="text-2xl font-black text-foreground mb-1">
            {t('inventory.title')} <span className="text-teal-400">{t('inventory.titleAccent')}</span>
          </h2>
          <p className="text-muted-foreground text-base">{t('inventory.subtitle')}</p>
        </div>
        <button onClick={handleOpenAdd}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
          <Plus className="w-4 h-4" /> {t('inventory.newItem')}
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        {/* Toolbar */}
        <div className={cn('p-4 border-b border-border flex flex-col sm:flex-row gap-3', isRTL && 'sm:flex-row-reverse')}>
          <div className="flex-1 bg-card rounded-xl border border-border flex items-center px-3 gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input type="text" placeholder={t('inventory.search')} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-base text-foreground placeholder:text-muted-foreground py-2" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card text-muted-foreground text-base rounded-xl px-4 py-2.5 sm:py-0 border border-border outline-none cursor-pointer">
            <option value="All">{t('inventory.allCategories')}</option>
            <option value="Drinks">{t('inventory.drinks')}</option>
            <option value="Food">{t('inventory.food')}</option>
            <option value="Other">{t('inventory.other')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
          <thead className="bg-card/50">
            <tr className="text-xs text-muted-foreground uppercase tracking-widest">
              <th className="px-6 py-4 font-bold">{t('inventory.itemName')}</th>
              <th className="px-6 py-4 font-bold">{t('inventory.category')}</th>
              <th className="px-6 py-4 font-bold">{t('inventory.price')}</th>
              <th className="px-6 py-4 font-bold">{t('inventory.stock')}</th>
              <th className={cn('px-6 py-4 font-bold', 'text-end')}>{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 opacity-20 mb-3" />
                    <p className="font-bold text-sm">{isRTL ? 'لا توجد عناصر في المخزون' : 'No items in inventory'}</p>
                  </div>
                </td>
              </tr>
            ) : filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-teal-400" />
                    </div>
                    <span className="font-bold text-base text-foreground">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="badge badge-muted">{item.category}</span>
                </td>
                <td className="px-6 py-5 font-mono font-bold text-teal-400 text-base">{item.price} EGP</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', item.stock < 10 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500')} />
                    <span className="text-base font-bold text-foreground">{item.stock}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className={cn('flex gap-2', isRTL ? 'justify-start' : 'justify-end')}>
                    <button onClick={() => setPriceHistoryFor({ id: item.id, name: item.name })}
                      className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-blue-400 transition-colors"
                      title="Price History">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl border border-border relative z-10"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-6', isRTL && 'flex-row-reverse')}>
                <h2 className="text-xl font-black text-foreground">
                  {editingItem ? t('inventory.editItem') : t('inventory.newItemModal')}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest block">{t('inventory.itemName')}</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputCls} placeholder={t('inventory.itemPlaceholder')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest block">{t('inventory.category')}</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={cn(inputCls, 'cursor-pointer')}>
                    <option className="bg-card" value="Drinks">{t('inventory.drinks')}</option>
                    <option className="bg-card" value="Food">{t('inventory.food')}</option>
                    <option className="bg-card" value="Other">{t('inventory.other')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest block">{t('inventory.priceLE')}</label>
                    <input type="number" required value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] text-muted-foreground font-bold uppercase tracking-widest block">{t('inventory.stockQty')}</label>
                    <input type="number" required value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })} className={inputCls} />
                  </div>
                </div>
                <button disabled={isPending}
                  className="w-full py-3.5 rounded-xl text-white font-black tracking-wide shadow-lg transition hover:opacity-90 active:scale-[0.97] disabled:opacity-50 mt-2"
                  style={{ background: editingItem ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                  {isPending ? t('inventory.processing') : editingItem ? t('inventory.saveChanges') : t('inventory.createItem')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
          </AnimatePresence>
      
      {/* Justification Modal for Delete */}
      <JustificationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, itemId: '', itemName: '' })}
        onConfirm={handleDeleteConfirm}
        title={isRTL ? 'تأكيد حذف صنف' : 'Confirm Item Deletion'}
        description={isRTL 
          ? `أنت على وشك حذف "${deleteModal.itemName}". يرجى توضيح السبب.`
          : `You are about to delete "${deleteModal.itemName}". Please provide a reason.`}
        isRTL={isRTL}
        isLoading={isPending}
      />

      <PriceHistoryModal
        entityType="InventoryItem"
        entityId={priceHistoryFor?.id ?? ""}
        entityName={priceHistoryFor?.name ?? ""}
        open={!!priceHistoryFor}
        onClose={() => setPriceHistoryFor(null)}
      />
    </div>
  );
}
