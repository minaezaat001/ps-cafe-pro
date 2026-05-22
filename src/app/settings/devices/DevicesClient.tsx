"use client";

import React, { useState, useMemo } from 'react';
import { Gamepad2, Plus, Trash2, Edit2, Monitor, X, Settings2, Tv, Laptop, Smartphone, Headset, Cpu, Check } from 'lucide-react';
import { addDevice, updateDevice, deleteDevice, addDeviceType, deleteDeviceType, updateDeviceType } from '@/app/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/ThemeContext';
import { useKeyPress } from '@/lib/useKeyPress';

interface DevicesPageProps { initialDevices: any[]; deviceTypes: any[]; user: any; }

const COLORS = [
  { name: 'amber', hex: '#fbbf24', label: 'Gold / Amber' },
  { name: 'orange', hex: '#f97316', label: 'Orange' },
  { name: 'rose', hex: '#e11d48', label: 'Rose / Red' },
  { name: 'fuchsia', hex: '#d946ef', label: 'Pink / Fuchsia' },
  { name: 'violet', hex: '#8b5cf6', label: 'Purple / Violet' },
  { name: 'blue', hex: '#3b82f6', label: 'Blue' },
  { name: 'cyan', hex: '#06b6d4', label: 'Cyan / Sky' },
  { name: 'emerald', hex: '#10b981', label: 'Green / Emerald' },
  { name: 'slate', hex: '#64748b', label: 'Silver / Slate' },
];

const getContrastColor = (colorName: string) => {
  const mapping: Record<string, string> = {
    amber: 'text-amber-700 dark:text-amber-400',
    orange: 'text-orange-700 dark:text-orange-400',
    rose: 'text-rose-700 dark:text-rose-400',
    fuchsia: 'text-fuchsia-700 dark:text-fuchsia-400',
    violet: 'text-violet-700 dark:text-violet-400',
    blue: 'text-blue-700 dark:text-blue-400',
    cyan: 'text-cyan-700 dark:text-cyan-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    slate: 'text-slate-700 dark:text-slate-400',
  };
  return mapping[colorName] || 'text-blue-700 dark:text-blue-400';
};

const ICONS = [
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Monitor', icon: Monitor },
  { name: 'Tv', icon: Tv },
  { name: 'Laptop', icon: Laptop },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Headset', icon: Headset },
  { name: 'Cpu', icon: Cpu },
];

export default function DevicesManagerPage({ initialDevices, deviceTypes, user }: DevicesPageProps) {
  const router = useRouter();
  const { t, isRTL } = useLang();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [isPending, setIsPending] = useState(false);
  
  // New Device Type form state
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('blue');
  const [newTypeIcon, setNewTypeIcon] = useState('Gamepad2');

  const defaultType = deviceTypes && deviceTypes.length > 0 ? deviceTypes[0].name : '';
  const [formData, setFormData] = useState<{number: string, type: string, hourlyRateSingle: number | string, hourlyRateMulti: number | string}>({ number: '', type: defaultType, hourlyRateSingle: 20, hourlyRateMulti: 30 });

  const colorHex = useMemo(() => {
    const map: Record<string, string> = {};
    COLORS.forEach(c => { map[c.name] = c.hex; });
    return map;
  }, []);

  const colorLabel = useMemo(() => {
    const map: Record<string, string> = {};
    COLORS.forEach(c => { map[c.name] = c.label; });
    return map;
  }, []);

  const typeLookup = useMemo(() => {
    const map: Record<string, any> = {};
    deviceTypes?.forEach((dt: any) => { map[dt.name] = dt; });
    return map;
  }, [deviceTypes]);

  // ── Keyboard Shortcuts ─────────────────────────────────
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (showAddModal || editingDevice) {
      setShowAddModal(false);
      setEditingDevice(null);
    } else if (showTypesModal) {
      setShowTypesModal(false);
    }
  }, showAddModal || !!editingDevice || showTypesModal);

  // Note: We don't bind global Enter in Devices client since there are multiple forms
  // that already handle Enter naturally due to standard <form onSubmit> behavior.

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      await addDevice({
        ...formData, 
        hourlyRateSingle: Number(formData.hourlyRateSingle) || 0,
        hourlyRateMulti: Number(formData.hourlyRateMulti) || 0
      });
      router.refresh();
      toast.success(`${t('devices.stationNumber')} #${formData.number} added!`);
      setShowAddModal(false); resetForm();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setIsPending(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    try {
      setIsPending(true);
      await updateDevice(editingDevice.id, {
        ...formData, 
        hourlyRateSingle: Number(formData.hourlyRateSingle) || 0,
        hourlyRateMulti: Number(formData.hourlyRateMulti) || 0
      });
      router.refresh();
      toast.success(`#${formData.number} updated!`);
      setEditingDevice(null); resetForm();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setIsPending(false); }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`${t('devices.deleteConfirm')}${number}${t('devices.deleteWarning')}`)) return;
    try { setIsPending(true); await deleteDevice(id); router.refresh(); toast.success('Device removed'); }
    catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setIsPending(false); }
  };

  const startEdit = (device: any) => {
    setEditingDevice(device);
    setFormData({ number: device.number, type: device.type, hourlyRateSingle: device.hourlyRateSingle, hourlyRateMulti: device.hourlyRateMulti });
  };

  const resetForm = () => setFormData({ number: '', type: defaultType, hourlyRateSingle: 20, hourlyRateMulti: 30 });

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      setIsPending(true);
      if (editingTypeId) {
        await updateDeviceType(editingTypeId, { name: newTypeName.trim().toUpperCase(), color: newTypeColor, icon: newTypeIcon });
        toast.success(`Type updated successfully!`);
      } else {
        await addDeviceType({ name: newTypeName.trim().toUpperCase(), color: newTypeColor, icon: newTypeIcon });
        toast.success(`Type added successfully!`);
      }
      setNewTypeName('');
      setEditingTypeId(null);
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setIsPending(false); }
  };

  const startEditType = (t: any) => {
    setEditingTypeId(t.id);
    setNewTypeName(t.name);
    setNewTypeColor(t.color);
    setNewTypeIcon(t.icon);
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا النوع؟' : 'Are you sure you want to delete this device type?')) return;
    try { setIsPending(true); await deleteDeviceType(id); toast.success(isRTL ? 'تم حذف النوع بنجاح' : 'Type removed'); }
    catch (err: any) { toast.error(err.message || (isRTL ? 'فشلت العملية' : 'Failed')); }
    finally { setIsPending(false); }
  };

  const inputCls = "w-full bg-card border border-border rounded-xl py-3 px-4 outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-blue-500/50 transition-colors";

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={cn('flex flex-col md:flex-row justify-between items-start md:items-center gap-4', isRTL && 'md:flex-row-reverse')}>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className="text-2xl font-black text-foreground mb-1">
            {t('devices.title')} <span className="text-blue-400">{t('devices.titleAccent')}</span>
          </h2>
          <p className="text-muted-foreground text-sm">{t('devices.subtitle')}</p>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => setShowTypesModal(true)}
              className="group relative px-5 py-3 rounded-xl font-bold text-sm text-foreground overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.97]"
              style={{
                background: isLight 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95))'
                  : 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
                border: isLight ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(99,102,241,0.3)',
                boxShadow: isLight 
                  ? '0 2px 8px rgba(99,102,241,0.08)' 
                  : '0 2px 12px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-500 transition-transform duration-300 group-hover:rotate-90" /> 
                {t('devices.manageTypes')}
              </span>
            </button>
            <button onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              <Plus className="w-4 h-4" /> {t('devices.addNew')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {initialDevices.map((device) => (
          <div key={device.id} className="glass-card p-6 rounded-2xl relative group overflow-hidden">
            <div className={cn('flex justify-between items-start mb-5', isRTL && 'flex-row-reverse')}>
              <div className="p-3 rounded-xl" style={{ 
                background: `linear-gradient(135deg, ${colorHex[typeLookup[device.type]?.color] || '#3b82f6'}20, ${colorHex[typeLookup[device.type]?.color] || '#3b82f6'}10)`,
                border: `1px solid ${colorHex[typeLookup[device.type]?.color] || '#3b82f6'}30`,
                color: colorHex[typeLookup[device.type]?.color] || '#3b82f6'
              }}>
                 {(() => {
                   const typeObj = typeLookup[device.type];
                   const Icon = ICONS.find(i => i.name === typeObj?.icon)?.icon || Gamepad2;
                   return <Icon className="w-5 h-5" />;
                 })()}
              </div>
              {user?.role === 'ADMIN' && (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(device)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(device.id, device.number)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className={cn('mb-5', isRTL && 'text-right')}>
              <h3 className="text-lg font-black text-foreground mb-0.5">Station #{device.number}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{device.type} {t('devices.configuration')}</p>
            </div>

            <div className={cn("grid grid-cols-2 gap-3")}>
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{t('devices.singleRate')}</p>
                <p className={cn("text-base font-black", getContrastColor(typeLookup[device.type]?.color || 'blue'))}>
                  {device.hourlyRateSingle} <span className="text-[10px]">EGP/HR</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{t('devices.multiRate')}</p>
                <p className={cn("text-base font-black", (typeLookup[device.type]?.color === 'amber' ? 'text-orange-600 dark:text-orange-400' : 'text-violet-600 dark:text-violet-400'))}>
                  {device.hourlyRateMulti} <span className="text-[10px]">EGP/HR</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {(showAddModal || editingDevice) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => { setShowAddModal(false); setEditingDevice(null); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-sm p-7 rounded-2xl border border-border relative z-10"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className={cn('flex justify-between items-center mb-6', isRTL && 'flex-row-reverse')}>
                <h2 className="text-xl font-black text-foreground">
                  {editingDevice ? t('devices.editStation') : t('devices.newStation')}
                </h2>
                <button onClick={() => { setShowAddModal(false); setEditingDevice(null); }}
                  className="p-2 hover:bg-muted rounded-xl text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={editingDevice ? handleUpdate : handleAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block">{t('devices.stationNumber')}</label>
                  <input type="text" required value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className={inputCls} placeholder="E.g. PS-07" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block">{t('devices.deviceType')}</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={cn(inputCls, 'cursor-pointer')}>
                    {deviceTypes?.map((t: any) => (
                      <option key={t.id} className="bg-card" value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block">{t('devices.singleLabel')}</label>
                    <input type="number" required value={formData.hourlyRateSingle}
                      onChange={(e) => setFormData({ ...formData, hourlyRateSingle: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block">{t('devices.multiLabel')}</label>
                    <input type="number" required value={formData.hourlyRateMulti}
                      onChange={(e) => setFormData({ ...formData, hourlyRateMulti: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className={inputCls} />
                  </div>
                </div>
                <button disabled={isPending}
                  className="w-full py-3.5 rounded-xl text-white font-black tracking-wide shadow-lg transition hover:opacity-90 active:scale-[0.97] disabled:opacity-50 mt-2"
                  style={{ background: editingDevice ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  {isPending ? t('devices.processing') : editingDevice ? t('devices.saveChanges') : t('devices.commitStation')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTypesModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              onClick={() => setShowTypesModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="glass-card w-full max-w-4xl rounded-3xl border border-border relative z-10 overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* ── Premium Header ───────────────────── */}
              <div className="px-8 py-6 border-b border-border" style={{
                background: isLight 
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(59,130,246,0.04))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.06))'
              }}>
                <div className={cn('flex justify-between items-center', isRTL && 'flex-row-reverse')}>
                  <div className={cn("flex items-center gap-4", isRTL && 'flex-row-reverse')}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                      boxShadow: '0 8px 24px -4px rgba(99,102,241,0.4)'
                    }}>
                      <Settings2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground">{t('devices.manageTypes')}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{t('devices.typeDialogSubtitle')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowTypesModal(false)}
                    className="p-2.5 rounded-xl transition-all text-muted-foreground hover:text-foreground" style={{
                      background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)'
                    }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* ── Left: Types List + Form ────────── */}
                <div className="lg:col-span-7 p-8 space-y-6" style={{
                  borderInlineEnd: '1px solid var(--border-base)'
                }}>
                  
                  {/* Existing Types */}
                  <div>
                    <div className={cn("flex items-center gap-2 mb-4", isRTL && "flex-row-reverse")}>
                      <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em]">
                        {isRTL ? 'الأنواع الحالية' : 'Current Types'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                        background: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)',
                        color: isLight ? '#4338ca' : '#818cf8'
                      }}>{deviceTypes?.length || 0}</span>
                    </div>
                    <div className="space-y-2 max-h-[25vh] overflow-y-auto scrollbar-hide pr-1">
                      {deviceTypes?.map((t: any) => {
                        const typeColor = colorHex[t.color] || '#3b82f6';
                        const TypeIcon = ICONS.find(i => i.name === t.icon)?.icon || Gamepad2;
                        return (
                          <div 
                            key={t.id} 
                            className={cn(
                              "flex justify-between items-center p-4 rounded-2xl border transition-colors duration-200 group relative overflow-hidden",
                              isRTL && "flex-row-reverse",
                              editingTypeId === t.id 
                                ? "border-indigo-500/50 shadow-lg" 
                                : "border-border hover:border-border"
                            )}
                            style={{
                              background: editingTypeId === t.id 
                                ? (isLight ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.08)') 
                                : (isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)')
                            }}
                          >
                            {/* Color accent bar */}
                            <div className="absolute top-0 bottom-0 w-1 rounded-full" style={{ 
                              background: typeColor,
                              [isRTL ? 'right' : 'left']: '0px'
                            }} />
                            <div className={cn("flex items-center gap-3 min-w-0 flex-1", isRTL ? 'mr-3' : 'ml-3')}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ 
                                background: `${typeColor}15`,
                                border: `1px solid ${typeColor}30`,
                                color: typeColor
                              }}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-foreground block text-sm truncate">{t.name}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {colorLabel[t.color] || t.color} · {t.icon}
                                </span>
                              </div>
                            </div>
                            <div className={cn("flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200", isRTL && 'flex-row-reverse')}>
                              <button onClick={() => startEditType(t)} disabled={isPending}
                                className="p-2 rounded-xl transition-colors" style={{
                                  background: isLight ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.1)',
                                  color: isLight ? '#2563eb' : '#60a5fa'
                                }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteType(t.id)} disabled={isPending}
                                className="p-2 rounded-xl transition-colors" style={{
                                  background: isLight ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.1)',
                                  color: isLight ? '#dc2626' : '#f87171'
                                }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Add / Edit Form ────────────────── */}
                  <form onSubmit={handleAddType} className="space-y-5 pt-5 border-t border-border">
                    <div className={cn("flex items-center gap-2 mb-1", isRTL && "flex-row-reverse")}>
                      <div className="w-1.5 h-5 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em]">
                        {editingTypeId ? (isRTL ? 'تعديل النوع' : 'Edit Type') : (isRTL ? 'نوع جديد' : 'New Type')}
                      </h3>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block px-1">{t('devices.typeName')}</label>
                       <input type="text" required value={newTypeName}
                         onChange={(e) => setNewTypeName(e.target.value)}
                         className={cn(inputCls, "text-base py-3.5 px-5 rounded-2xl")} 
                         placeholder="e.g. VIP ROOM" />
                    </div>

                    {/* Color Picker — Compact & Visual */}
                    <div className="space-y-3">
                      <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block px-1">{t('devices.themeColor')}</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setNewTypeColor(c.name)}
                            className={cn(
                              "w-9 h-9 rounded-xl transition-all duration-300 relative flex items-center justify-center",
                              newTypeColor === c.name 
                                ? "ring-2 ring-offset-2 ring-offset-background scale-110 shadow-lg" 
                                : "hover:scale-105 opacity-70 hover:opacity-100"
                            )}
                            style={{ 
                              backgroundColor: c.hex,
                              ...(newTypeColor === c.name ? { ringColor: c.hex } : {})
                            }}
                            title={c.label}
                          >
                            {newTypeColor === c.name && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Icon Picker — Grid */}
                    <div className="space-y-3">
                      <label className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest block px-1">{t('devices.stationIcon')}</label>
                      <div className="flex flex-wrap gap-2.5">
                        {ICONS.map((item) => {
                          const selectedColor = colorHex[newTypeColor] || '#3b82f6';
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setNewTypeIcon(item.name)}
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300",
                                newTypeIcon === item.name 
                                  ? "shadow-md scale-105" 
                                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
                              )}
                              style={newTypeIcon === item.name ? {
                                background: `${selectedColor}15`,
                                borderColor: `${selectedColor}40`,
                                color: selectedColor,
                              } : {
                                background: isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.03)'
                              }}
                            >
                              <item.icon className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button disabled={isPending || !newTypeName.trim()}
                        className="flex-1 py-3.5 rounded-2xl text-white font-black text-sm tracking-wide shadow-xl transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                        style={{ 
                          background: editingTypeId 
                            ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' 
                            : 'linear-gradient(135deg,#3b82f6,#6366f1)', 
                          boxShadow: editingTypeId 
                            ? '0 8px 24px -6px rgba(139,92,246,0.5)' 
                            : '0 8px 24px -6px rgba(59,130,246,0.5)' 
                        }}>
                        {isPending ? t('devices.processing') : (editingTypeId ? t('devices.updateType') : t('devices.createType'))}
                      </button>
                      {editingTypeId && (
                        <button type="button" onClick={() => { setEditingTypeId(null); setNewTypeName(''); }}
                          className="px-5 py-3.5 rounded-2xl font-bold text-sm text-muted-foreground transition-all" style={{
                            background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.05)',
                          }}>
                          {t('settings.cancel') || "Cancel"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* ── Right: Live Preview ─────────────── */}
                <div className="lg:col-span-5 p-8 flex flex-col items-center justify-center" style={{
                  background: isLight 
                    ? 'linear-gradient(180deg, rgba(241,245,249,0.8), rgba(248,250,252,0.5))'
                    : 'linear-gradient(180deg, rgba(15,23,42,0.3), rgba(15,23,42,0.1))'
                }}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em]">{t('devices.livePreview')}</p>
                  </div>
                  
                  {/* Mock Device Card */}
                  <div 
                    className="w-full max-w-[280px] rounded-3xl overflow-hidden border-t-4 transition-all duration-500"
                    style={{ 
                      background: isLight 
                        ? 'rgba(255,255,255,0.98)'
                        : 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.85))',
                      borderTopColor: colorHex[newTypeColor] || '#3b82f6',
                      boxShadow: isLight 
                        ? `0 4px 20px -4px ${(colorHex[newTypeColor] || '#3b82f6')}25, 0 8px 30px -10px rgba(0,0,0,0.12)`
                        : `0 20px 50px -12px ${(colorHex[newTypeColor] || '#3b82f6')}40`,
                      border: isLight ? '1px solid rgba(15,23,42,0.08)' : 'none',
                      borderTop: `4px solid ${colorHex[newTypeColor] || '#3b82f6'}`
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                            background: `linear-gradient(135deg, ${(colorHex[newTypeColor] || '#3b82f6')}20, ${(colorHex[newTypeColor] || '#3b82f6')}10)`,
                            border: `1px solid ${(colorHex[newTypeColor] || '#3b82f6')}30`,
                            color: colorHex[newTypeColor] || '#3b82f6'
                          }}>
                            {(() => {
                              const PreviewIcon = ICONS.find(i => i.name === newTypeIcon)?.icon || Gamepad2;
                              return <PreviewIcon className="w-6 h-6" />;
                            })()}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-foreground leading-tight">#99</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {newTypeName || "Station Name"}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{
                          background: isLight ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)',
                          color: isLight ? '#047857' : '#34d399',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}>
                          Available
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="h-14 rounded-2xl flex items-center justify-center" style={{
                          background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)',
                          border: isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <span className="font-mono text-2xl font-black" style={{
                            color: isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.15)'
                          }}>00:00:00</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="h-10 rounded-xl" style={{
                            background: `${(colorHex[newTypeColor] || '#3b82f6')}15`,
                            border: `1px solid ${(colorHex[newTypeColor] || '#3b82f6')}25`,
                          }}></div>
                          <div className="h-10 rounded-xl" style={{
                            background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.04)',
                            border: isLight ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)'
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-[12px] text-muted-foreground text-center max-w-[240px] leading-relaxed">
                    {`"${t('devices.previewDesc')}"`}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
