'use client';

import React, { useEffect, useState } from 'react';

interface RecycleBinProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function RecycleBin({ windowId, focusWindow }: RecycleBinProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>

    </div>
  );
}
