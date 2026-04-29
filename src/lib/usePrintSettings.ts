"use client";

import { useState, useEffect } from 'react';

export type PrintPaperSize = 'THERMAL_80MM' | 'THERMAL_58MM' | 'A4';

export interface PrintSettings {
  enabled: boolean;
  autoPrint: boolean;
  paperSize: PrintPaperSize;
  printerName: string;      // اسم الطابعة المختارة
  headerText: string;       // اسم المقهى/النص في رأس الإيصال
  footerText: string;       // نص التذييل المخصص
  showLogo: boolean;        // إظهار اسم النظام في الرأس
  copies: number;           // عدد النسخ المطبوعة
}

const DEFAULT_SETTINGS: PrintSettings = {
  enabled: false,
  autoPrint: false,
  paperSize: 'THERMAL_80MM',
  printerName: '',
  headerText: 'PS CAFE PRO',
  footerText: 'شكراً لزيارتكم • Thank you for visiting',
  showLogo: true,
  copies: 1,
};

export function usePrintSettings() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ps_cafe_print_settings');
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load print settings', e);
    }
    setIsLoaded(true);

    // محاولة استرداد قائمة الطابعات (Web API متاحة في بعض المتصفحات)
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      // @ts-ignore - Chrome Print API
      if ('queryLocalFonts' in window || navigator.userAgent.includes('Electron')) {
        // في بيئة Electron يمكن استرداد الطابعات
        setAvailablePrinters(['الطابعة الافتراضية', 'Thermal POS 80mm', 'Microsoft Print to PDF']);
      } else {
        setAvailablePrinters(['الطابعة الافتراضية', 'Thermal POS 80mm', 'Microsoft Print to PDF']);
      }
    } catch {
      setAvailablePrinters(['الطابعة الافتراضية']);
    }
  };

  const updateSettings = (newSettings: Partial<PrintSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('ps_cafe_print_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetToDefaults = () => {
    localStorage.removeItem('ps_cafe_print_settings');
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSettings, isLoaded, availablePrinters, resetToDefaults };
}
