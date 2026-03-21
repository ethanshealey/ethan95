'use client';

import React, { useEffect, useState } from 'react';

interface NotepadProps {
  windowId: string;
  focusWindow: (id: string) => void;
  defaultContent?: string;
}

export default function Notepad({ windowId, focusWindow, defaultContent }: NotepadProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();

    if(defaultContent) {
      setText(defaultContent)
    }
  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      
    </div>
  );
}
