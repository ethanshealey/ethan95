'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem, FileIcons } from '../components/FileSystem';

interface MyComputerProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const items: FileItem[] = [
  { name: '3½ Floppy (A:)', icon: FileIcons.FLOPPY, type: 'folder' },
  { name: 'Local Disk (C:)', icon: FileIcons.HARD_DRIVE, type: 'folder' },
  { name: 'CD-ROM (D:)', icon: FileIcons.CD_DRIVE, type: 'folder' },
];

export default function MyComputer({ windowId, focusWindow }: MyComputerProps) {
  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <FileSystem items={items} />
    </div>
  );
}
