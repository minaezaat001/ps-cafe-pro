"use client";

import React, { useState } from 'react';
import { Gamepad2, User, Mail, Lock, Building, Phone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { signup } from '../actions/onboarding.actions';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error("كلمات المرور غير متطابقة");
    }
    
    setIsLoading(true);
    try {
      await signup(formData);
      setIsSuccess(true);
      toast.success("مرحباً بك! جاري تجهيز مساحة العمل الخاصة بك...");
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-[#0f1117]" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-lg p-8 rounded-3xl relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl mb-4 bg-gradient-to-br from-blue-500 to-violet-500">
                  <Gamepad2 className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">
                  ابدأ <span className="text-blue-400">فترتك التجريبية</span> (7 أيام)
                </h1>
                <p className="text-muted-foreground text-sm font-medium">انضم لأكثر من 500 كافيه بلايستيشن مميز</p>
              </div>

              <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">اسم الكافيه / النشاط</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="مثال: Matrix Gaming Zone"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">رقم التليفون</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="مثال: 01155261969"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-600 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">البريد الإلكتروني</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="admin@cafe.com"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-600 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">اسم مستخدم الإدارة</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      placeholder="اختر اسم مستخدم"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">كلمة المرور الأساسية</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">تأكيد كلمة المرور</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                      className="bg-transparent border-none outline-none w-full text-sm font-medium text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  disabled={isLoading}
                  className="md:col-span-2 w-full py-4 rounded-xl font-bold tracking-wide text-white flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 transition-all mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>إنشاء الحساب وبدء التجربة <ArrowLeft className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
                لديك حساب بالفعل؟ <a href="/login" className="text-blue-400 hover:underline">تسجيل الدخول</a>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-12 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black mb-2">تم إنشاء الحساب!</h2>
              <p className="text-muted-foreground font-medium">جاري تجهيز مساحة العمل الخاصة بك...</p>
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mt-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
