'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem, FileIcons } from '../components/FileSystem';
import { APPLICATIONS, RegisteredApp } from '../applications/index'
import { useWindowManager } from '../hooks/useWindowManager';

interface ProgramsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const items: FileItem[] = [
  { name: '3½ Floppy (A:)', icon: FileIcons.FLOPPY, type: 'folder' },
  { name: 'Local Disk (C:)', icon: FileIcons.HARD_DRIVE, type: 'folder' },
  { name: 'CD-ROM (D:)', icon: FileIcons.CD_DRIVE, type: 'folder' },
];

export default function Programs({ windowId, focusWindow }: ProgramsProps) {

  const { openWindow, unfocusAll } = useWindowManager()

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <FileSystem items={APPLICATIONS.map((app) => ({ name: app.name, icon: app.icon, type: 'folder', onOpen: () => openWindow(app.id) }))} />
    </div>
  );
}
