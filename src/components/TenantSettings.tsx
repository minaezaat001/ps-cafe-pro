"use client";

import React, { useState, useEffect } from 'react';
import { Globe, CalendarDays, Save, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/LanguageContext';

interface TenantSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
}

const currencies = [
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

const timezones = [
  { value: 'Africa/Cairo', label: 'Africa/Cairo (Egypt)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (Saudi Arabia)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
  { value: 'Asia/Qatar', label: 'Asia/Qatar (Qatar)' },
  { value: 'Asia/Kuwait', label: 'Asia/Kuwait (Kuwait)' },
  { value: 'Asia/Bahrain', label: 'Asia/Bahrain (Bahrain)' },
  { value: 'Asia/Muscat', label: 'Asia/Muscat (Oman)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
];

export default function TenantSettings() {
  const { t, isRTL } = useLang();
  const [settings, setSettings] = useState<TenantSettings>({
    currency: 'EGP',
    currencySymbol: 'ج.م',
    timezone: 'Africa/Cairo'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/tenant')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        setIsLoading(false);
      });
  }, []);

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    setSettings(prev => ({
      ...prev,
      currency: currencyCode,
      currencySymbol: currency?.symbol || prev.currencySymbol
    }));
  };

  const handleSave = async () => {
    const reason = prompt(isRTL ? 'سبب التعديل:' : 'Reason for change:') || 'Tenant settings updated';
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, reason }),
      });
      
      if (!res.ok) throw new Error('Update failed');
      toast.success(isRTL ? 'تم تحديث الإعدادات بنجاح' : 'Settings updated successfully');
    } catch {
      toast.error(isRTL ? 'فشل في تحديث الإعدادات' : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Currency Settings */}
      <div className="glass-card rounded-2xl p-6 border border-border/30">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-400" strokeWidth={2} />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h3 className="text-sm font-bold tracking-wide uppercase text-blue-400">
              {isRTL ? 'العملة والرمز' : 'Currency & Symbol'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'اختر العملة المستخدمة في الكافيه' : 'Select the currency used in your cafe'}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'العملة' : 'Currency'}
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'رمز العملة' : 'Currency Symbol'}
            </label>
            <input
              type="text"
              value={settings.currencySymbol}
              onChange={(e) => setSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
              placeholder={isRTL ? 'مثال: ج.م' : 'e.g., $'}
            />
          </div>
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="glass-card rounded-2xl p-6 border border-border/30">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-purple-400" strokeWidth={2} />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h3 className="text-sm font-bold tracking-wide uppercase text-purple-400">
              {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRTL ? 'اختر التوقيت المحلي لمنطقتك' : 'Select your local timezone'}
            </p>
          </div>
        </div>
        
        <div>
          <label className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
            className={`w-full px-4 py-3 rounded-xl border border-border/50 bg-card/50 text-foreground text-sm font-medium focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all ${isRTL ? 'text-right' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
      </button>
    </div>
  );
}
