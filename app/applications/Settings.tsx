'use client';

import React from 'react';
import { Checkbox, Frame } from 'react95';
import { useSettings } from '../context/SettingsContext';

interface SettingsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function Settings({ windowId, focusWindow }: SettingsProps) {
  const { crtEnabled, setCrtEnabled } = useSettings();

  const stop = (e: React.MouseEvent) => { e.stopPropagation(); focusWindow(windowId); };

  return (
    <div className="app-content" onClick={stop} style={{ padding: '8px', boxSizing: 'border-box' }}>
      <Frame variant="well" style={{ padding: '12px', flex: 1, boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>Display</div>
        <Checkbox
          checked={crtEnabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCrtEnabled(e.target.checked)}
          label="CRT screen effect"
          name="crt-toggle"
        />
      </Frame>
    </div>
  );
}
