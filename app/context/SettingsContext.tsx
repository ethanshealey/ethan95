'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  crtEnabled: boolean;
  setCrtEnabled: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [crtEnabled, setCrtEnabledState] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('crtEnabled');
    if (stored !== null) {
      setCrtEnabledState(stored === 'true');
    }
  }, []);

  const setCrtEnabled = (val: boolean) => {
    setCrtEnabledState(val);
    localStorage.setItem('crtEnabled', String(val));
  };

  return (
    <SettingsContext.Provider value={{ crtEnabled, setCrtEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
