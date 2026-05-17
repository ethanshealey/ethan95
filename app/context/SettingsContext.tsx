'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  crtEnabled: boolean;
  setCrtEnabled: (val: boolean) => void;
  clickSoundEnabled: boolean;
  setClickSoundEnabled: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [crtEnabled, setCrtEnabledState] = useState(true);
  const [clickSoundEnabled, setClickSoundEnabledState] = useState(false);

  useEffect(() => {
    const storedCrt = localStorage.getItem('crtEnabled');
    if (storedCrt !== null) setCrtEnabledState(storedCrt === 'true');

    const storedClick = localStorage.getItem('clickSoundEnabled');
    if (storedClick !== null) setClickSoundEnabledState(storedClick === 'true');
  }, []);

  const setCrtEnabled = (val: boolean) => {
    setCrtEnabledState(val);
    localStorage.setItem('crtEnabled', String(val));
  };

  const setClickSoundEnabled = (val: boolean) => {
    setClickSoundEnabledState(val);
    localStorage.setItem('clickSoundEnabled', String(val));
  };

  return (
    <SettingsContext.Provider value={{ crtEnabled, setCrtEnabled, clickSoundEnabled, setClickSoundEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
