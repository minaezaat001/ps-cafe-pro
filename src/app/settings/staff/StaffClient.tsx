"use client";

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, User, Key, Trash2, Edit2, X, Shield, Lock, Unlock, Check } from 'lucide-react';
import { addUser, updateUser, deleteUser } from '@/app/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { useKeyPress } from '@/lib/useKeyPress';

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }

const PERMISSION_DEFS = [
  { id: 'dashboard.manage', labelAr: 'المراقبة والجلسات', labelEn: 'Dashboard & Sessions', descAr: 'فتح وإغلاق الأجهزة.', descEn: 'Start and end device sessions.' },
  { id: 'cafeteria.manage', labelAr: 'الكافيتريا', labelEn: 'Cafeteria', descAr: 'طلبات المشروبات والمأكولات.', descEn: 'Manage food and drinks orders.' },
  { id: 'finance.manage', labelAr: 'الخزنة والماليات', labelEn: 'Finance', descAr: 'إضافة مسحوبات أو إيداع.', descEn: 'Add expenses and income.' },
  { id: 'reports.view', labelAr: 'التقارير والمبيعات', labelEn: 'Reports', descAr: 'استعراض الفواتير السابقة.', descEn: 'View historical invoices and shifts.' },
  { id: 'inventory.manage', labelAr: 'المخزن', labelEn: 'Inventory', descAr: 'تعديل أصناف الكافيتريا والتسعير.', descEn: 'Manage cafeteria items and stock.' },
  { id: 'devices.manage', labelAr: 'الأجهزة والتسعير', labelEn: 'Devices & Rates', descAr: 'إضافة أجهزة الـ PS وتعديل سعرها.', descEn: 'Add devices and edit hourly rates.' },
  { id: 'staff.manage', labelAr: 'فريق العمل', labelEn: 'Staff', descAr: 'إدارة المستخدمين والصلاحيات.', descEn: 'Add and edit users/roles.' },
  { id: 'shift.manage', labelAr: 'إدارة الورديات', labelEn: 'Shift Management', descAr: 'فتح وإغلاق وردية الكاشير.', descEn: 'Open and close cashier shifts.' },
  { id: 'settings.manage', labelAr: 'إعدادات النظام', labelEn: 'System Settings', descAr: 'تصفير البيانات والنسخ الاحتياطي.', descEn: 'Clear data, backups, and app settings.' }
];

const PRESET_STAFF = ['dashboard.manage', 'cafeteria.manage', 'finance.manage', 'shift.manage'];

interface StaffClientProps { users: any[] }

export default function StaffClient({ users }: StaffClientProps) {
  const router = useRouter();
  const { t, isRTL, lang } = useLang();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'STAFF', permissions: [...PRESET_STAFF] });

  // ── Keyboard Shortcuts ─────────────────────────────────
  useKeyPress('Escape', () => {
    if (isPending) return;
    if (showModal) setShowModal(false);
  }, showModal);

  // Sync role defaults
  const handleRoleChange = (role: string) => {
    if (role === 'ADMIN') setFormData({ ...formData, role, permissions: PERMISSION_DEFS.map(p => p.id) });
    else if (role === 'STAFF') setFormData({ ...formData, role, permissions: [...PRESET_STAFF] });
    else setFormData({ ...formData, role });
  };

  const handleTogglePermission = (permId: string) => {
    if (formData.role === 'ADMIN') return; // Admin is locked to all
    
    let newPerms = formData.permissions.includes(permId) 
      ? formData.permissions.filter(p => p !== permId)
      : [...formData.permissions, permId];
      
    // Auto switch to CUSTOM if they deviate from STAFF preset
    let newRole = formData.role;
    if (formData.role === 'STAFF') {
      const isExactStaff = newPerms.length === PRESET_STAFF.length && newPerms.every(p => PRESET_STAFF.includes(p));
      if (!isExactStaff) newRole = 'CUSTOM';
    }

    setFormData({ ...formData, role: newRole, permissions: newPerms });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsPending(true);
    try {
      const payload = { 
        username: formData.username, 
        password: formData.password, 
        role: formData.role,
        permissions: JSON.stringify(formData.permissions)
      };

      if (editingUser) { 
        // If password wasn't changed, don't send it to avoid rehashing empty or same raw value
        if (!formData.password || formData.password === editingUser.password) {
           delete (payload as any).password;
        }
        await updateUser(editingUser.id, payload); 
        router.refresh(); toast.success(isRTL ? 'تم تحديث المستخدم' : 'User updated'); 
      }
      else { 
        await addUser(payload); 
        router.refresh(); toast.success(isRTL ? 'تم إضافة المستخدم' : 'User added'); 
      }
      setShowModal(false); setEditingUser(null);
      setFormData({ username: '', password: '', role: 'STAFF', permissions: [...PRESET_STAFF] });
    } catch { toast.error(isRTL ? 'فشلت العملية' : 'Operation failed'); }
    finally { setIsPending(false); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (username === 'admin') { toast.error(isRTL ? 'لا يمكن حذف المدير الأساسي' : 'Cannot delete root admin'); return; }
    if (!confirm(isRTL ? `هل أنت متأكد من حذف الموظف ${username}؟` : `Delete staff ${username}?`)) return;
    try { await deleteUser(id); router.refresh(); toast.success(isRTL ? 'تم الحذف' : 'User deleted'); }
    catch { toast.error(isRTL ? 'فشل الحذف' : 'Failed to delete user'); }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    
    let perms = [];
    try { perms = JSON.parse(user.permissions || '[]'); } catch(e) { perms = []; }
    
    // Always enforce admin perms locally if user role says ADMIN 
    if (user.role === 'ADMIN') perms = PERMISSION_DEFS.map(p => p.id);
    else if (perms.length === 0 && user.role === 'STAFF') perms = [...PRESET_STAFF];

    setFormData({ 
      username: user.username, 
      password: user.password, // This will be the hash, but we replace if user types a new one
      role: user.role,
      permissions: perms
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={cn('flex flex-col md:flex-row justify-between items-start md:items-center gap-4', isRTL && 'md:flex-row-reverse')}>
        <div>
          <h2 className="text-2xl font-black text-foreground mb-1">
            {t('staff.title')} <span className="text-violet-400">{t('staff.titleAccent')}</span>
          </h2>
          <p className="text-muted-foreground text-sm">{t('staff.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setFormData({ username: '', password: '', role: 'STAFF', permissions: [...PRESET_STAFF] }); setShowModal(true); }}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base text-white transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}
        >
          <UserPlus className="w-5 h-5" /> {isRTL ? 'توظيف مستخدم جديد' : 'Recruit Staff'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {users.map((user) => {
          let perms = [];
          try { perms = JSON.parse(user.permissions || '[]'); } catch(e) { perms = []; }
          if (user.role === 'ADMIN') perms = PERMISSION_DEFS.map(p => p.id);
          else if (perms.length === 0 && user.role === 'STAFF') perms = [...PRESET_STAFF];

          return (
            <motion.div layout key={user.id} className="glass-card p-6 rounded-3xl relative group border border-border/50 shadow-sm flex flex-col h-full">
              <div className={cn('flex justify-between items-start mb-5', isRTL && 'flex-row-reverse')}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner",
                    user.role === 'ADMIN' ? 'bg-fuchsia-500/15 text-fuchsia-400' : 
                    user.role === 'CUSTOM' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-violet-500/15 text-violet-400'
                  )}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">{user.username}</h3>
                    <div className={cn(
                      'mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest inline-flex items-center gap-1 uppercase border',
                      user.role === 'ADMIN' ? 'border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-500/5' : 
                      user.role === 'CUSTOM' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-violet-500/20 text-violet-400 bg-violet-500/5'
                    )}>
                      {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : user.role === 'CUSTOM' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {user.role}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(user)} className="p-2.5 rounded-xl bg-card border border-border hover:border-blue-500/30 text-muted-foreground hover:text-blue-400 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(user.id, user.username)} className="p-2.5 rounded-xl bg-card border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border border-dashed">
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-3">
                  {isRTL ? 'الصلاحيات المتاحة' : 'Active Permissions'} ({perms.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.role === 'ADMIN' ? (
                     <span className="px-2 py-1 rounded-lg bg-muted text-foreground/70 text-xs font-semibold inline-flex items-center gap-1"><Shield className="w-3 h-3" /> {isRTL ? 'الوصول الكامل لجميع الخصائص' : 'Full System Access'}</span>
                  ) : (
                    PERMISSION_DEFS.map(p => {
                      if (!perms.includes(p.id)) return null;
                      return (
                        <span key={p.id} className="px-2 py-1 rounded-lg bg-muted text-foreground/70 text-xs font-semibold">
                          {lang === 'ar' ? p.labelAr : p.labelEn}
                        </span>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card w-full max-w-3xl p-0 rounded-3xl border flex flex-col md:flex-row border-border relative z-10 overflow-hidden max-h-[90vh]"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="w-full md:w-5/12 bg-muted/30 p-8 border-b md:border-b-0 md:border-e border-border flex flex-col">
                <div className={cn('flex justify-between items-start mb-8', isRTL && 'flex-row-reverse')}>
                  <h2 className="text-2xl font-black text-foreground">
                    {editingUser ? (isRTL ? 'تعديل المستخدم' : 'Edit User') : (isRTL ? 'موظف جديد' : 'New Staff')}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <form id="staff-form" onSubmit={handleSubmit} className="space-y-5 flex-1">
                  <div className="space-y-2">
                    <label className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">{isRTL ? 'اسم الدخول' : 'Username'}</label>
                    <div className="relative">
                      <User className={cn("w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 z-10", 'start-4')} />
                      <input type="text" required placeholder="johndoe" value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={cn(
                          "bg-card w-full rounded-2xl py-3 border border-border outline-none transition-colors focus:border-violet-500/50 text-sm font-bold placeholder:text-muted-foreground/30",
                          'ps-11 pe-4'
                        )} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">{isRTL ? 'الرقم السري' : 'Password'}</label>
                    <div className="relative">
                      <Key className={cn("w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 z-10", 'start-4')} />
                      <input type="text" required={!editingUser} placeholder={editingUser ? '••••••••' : 'password'} value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={cn(
                          "bg-card w-full rounded-2xl py-3 border border-border outline-none transition-colors focus:border-violet-500/50 text-sm font-bold placeholder:text-muted-foreground/30",
                          'ps-11 pe-4'
                        )} />
                    </div>
                    {editingUser && <p className="text-[10px] text-muted-foreground mt-1 px-1">↳ {isRTL ? 'اتركها فارغة إذا لم ترد التغيير' : 'Leave empty to keep existing password'}</p>}
                  </div>

                  <div className="space-y-2 mt-6">
                    <label className="text-[11px] text-muted-foreground font-black uppercase tracking-widest block">{isRTL ? 'نوع الحساب' : 'Role Variant'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'STAFF', icon: User, color: 'violet' },
                        { id: 'CUSTOM', icon: Unlock, color: 'emerald' },
                        { id: 'ADMIN', icon: Shield, color: 'fuchsia' }
                      ].map(r => (
                        <button key={r.id} type="button" onClick={() => handleRoleChange(r.id)}
                          className={cn(
                            'p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-black tracking-widest uppercase',
                            formData.role === r.id
                              ? `bg-${r.color}-500/15 border-${r.color}-500/40 text-${r.color}-400 ring-2 ring-${r.color}-500/20`
                              : 'bg-card border-border text-muted-foreground hover:bg-muted shrink-0 opacity-60'
                          )}>
                          <r.icon className="w-5 h-5 mb-0.5" />
                          {r.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              {/* Permissions Grid */}
              <div className="w-full md:w-7/12 p-8 overflow-y-auto hidden-scrollbar flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-foreground">{isRTL ? 'تخصيص الصلاحيات' : 'Access Permissions'}</h3>
                  <p className="text-xs font-bold text-muted-foreground mt-1">
                    {formData.role === 'ADMIN' 
                      ? (isRTL ? 'أدمن لديه وصول لكل شيء.' : 'Admins have full unhindered access.')
                      : formData.role === 'STAFF'
                      ? (isRTL ? 'هذه الصلاحيات الافتراضية للكاشير (يمكنك التعديل).' : 'Default cashier presets (fully modifiable).')
                      : (isRTL ? 'تحكم كامل بكل صلاحية على حدى.' : 'Granular fine-tuned control.')}
                  </p>
                </div>

                <div className="space-y-3 flex-1 pb-6 pr-2 max-h-[500px] overflow-y-auto scrollbar-hide">
                  {PERMISSION_DEFS.map(p => {
                    const isOn = formData.permissions.includes(p.id);
                    const isDisabled = formData.role === 'ADMIN';

                    return (
                      <div key={p.id} onClick={() => !isDisabled && handleTogglePermission(p.id)}
                        className={cn(
                          "group relative flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer select-none overflow-hidden",

                          isOn 
                            ? "bg-card border-violet-500/30 shadow-[0_4px_20px_-10px_rgba(139,92,246,0.15)]" 
                            : "bg-muted/30 border-border/50 hover:bg-muted/60 opacity-80",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}>
                        
                        {isOn && (
                          <motion.div layoutId={`glow-${p.id}`} className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                        )}

                        <div className={cn("flex flex-col relative z-10", "text-start ms-2")}>
                          <span className={cn("font-bold text-[15px] transition-colors", isOn ? "text-foreground" : "text-muted-foreground")}>
                            {lang === 'ar' ? p.labelAr : p.labelEn}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground/70 mt-0.5">
                            {lang === 'ar' ? p.descAr : p.descEn}
                          </span>
                        </div>

                        {/* Beautiful iOS inspired Switch */}
                        <div className={cn(
                          "relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0 z-10 shadow-inner border border-black/10 dark:border-white/5",
                          isOn ? "bg-violet-500" : "bg-zinc-300 dark:bg-zinc-800"
                        )}>
                          <motion.div 
                            className="absolute top-[2px] bottom-[2px] w-[20px] bg-white rounded-full shadow-sm flex items-center justify-center"
                            animate={{ left: isOn ? "calc(100% - 22px)" : "2px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          >
                            {isOn && <Check className="w-2.5 h-2.5 text-violet-500" strokeWidth={4} />}
                          </motion.div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-border mt-auto">
                    <button form="staff-form" disabled={isPending}
                      className="w-full py-4 rounded-2xl text-white font-black tracking-wide shadow-xl shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                      {isPending ? t('staff.processing') : editingUser ? t('staff.confirmChanges') : t('staff.initializeOperator')}
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
