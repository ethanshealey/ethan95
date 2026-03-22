'use client';

import React, { useEffect, useState } from 'react';

interface NotepadProps {
  windowId: string;
  focusWindow: (id: string) => void;
  defaultContent?: string;
}

export default function Notepad({ windowId, focusWindow, defaultContent }: NotepadProps) {
  const [documentContent, setDocumentContent] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();

    if(defaultContent) {
      setDocumentContent(defaultContent)
    }
  }, [])

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <iframe src={documentContent ? `${documentContent}#toolbar=0` : undefined} width="100%" height="100%" style={{ border: 'none' }} />
    </div>
  );
}
