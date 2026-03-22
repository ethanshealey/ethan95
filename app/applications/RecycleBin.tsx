'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem, FileIcons } from '../components/FileSystem';
import { useWindowManager } from '../hooks/useWindowManager';

interface RecycleBinProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const SECRET_CONTENT = `Why are you snooping around in the recycle bin?`;

export default function RecycleBin({ windowId, focusWindow }: RecycleBinProps) {

  const { openWindow, unfocusAll } = useWindowManager()

  const items: FileItem[] = [
    { name: 'secret.txt', icon: FileIcons.DOCUMENT, type: 'file', size: '18 KB', modified: '1/5/2026', onOpen: () => openWindow('notepad', { title: 'secret.txt', props: { defaultContent: SECRET_CONTENT } }) },
  ];

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <FileSystem items={items} />
    </div>
  );
}
