'use client';

import React, { useEffect, useState } from 'react';

interface MyDocumentsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function MyDocuments({ windowId, focusWindow }: MyDocumentsProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>

    </div>
  );
}
