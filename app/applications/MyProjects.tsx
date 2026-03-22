'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem } from '../components/FileSystem';
import { Icons } from '../icons/icons';

interface MyProjectsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const items: FileItem[] = [
  { name: '3½ Floppy (A:)', icon: Icons.FLOPPY_DRIVE_3_5, type: 'folder' },
  { name: 'Local Disk (C:)', icon: Icons.HARD_DISK_DRIVE, type: 'folder' },
  { name: 'CD-ROM (D:)', icon: Icons.CD_DRIVE, type: 'folder' },
];

export default function MyProjects({ windowId, focusWindow }: MyProjectsProps) {
  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <FileSystem items={items} />
    </div>
  );
}
