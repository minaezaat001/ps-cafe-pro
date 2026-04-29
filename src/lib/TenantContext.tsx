"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TenantSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
}

interface TenantContextType {
  settings: TenantSettings | null;
  isLoading: boolean;
  refreshSettings: () => void;
}

const defaultSettings: TenantSettings = {
  currency: "EGp",
  currencySymbol: "ج.م",
  timezone: "Africa/Cairo"
};

const TenantContext = createContext<TenantContextType>({
  settings: defaultSettings,
  isLoading: true,
  refreshSettings: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TenantSettings | null>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/tenant');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load tenant settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <TenantContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantSettings() {
  return useContext(TenantContext);
}
