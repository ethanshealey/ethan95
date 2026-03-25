'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem } from '../components/FileSystem';
import { Icons } from '../icons/icons';

interface MyProjectsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const items: FileItem[] = [
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
