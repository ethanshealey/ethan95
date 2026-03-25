'use client';

import React, { useEffect, useState } from 'react';

interface MinesweeperRecordsProps {
  windowId: string;
  focusWindow: (id: string) => void;
  defaultContent?: string;
}

export default function MinesweeperRecords({ windowId, focusWindow, defaultContent }: MinesweeperRecordsProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();

    focusWindow(windowId)

  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      
    </div>
  );
}
