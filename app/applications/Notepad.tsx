'use client';

import React, { useEffect, useState } from 'react';

interface NotepadProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function Notepad({ windowId, focusWindow }: NotepadProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <textarea
        id={windowId}
        className="notepad-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
        placeholder=""
      />
    </div>
  );
}
