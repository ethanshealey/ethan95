'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem, FileIcons } from '../components/FileSystem';
import { useWindowManager } from '../hooks/useWindowManager';
import { Icons } from '../icons/icons';

interface MyDocumentsProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

const NOTE_CONTENT = `TODO:\n1) Build cool portfolio ;)\n2) Call mom\n3) Buy groceries`;

export default function MyDocuments({ windowId, focusWindow }: MyDocumentsProps) {

  const { openWindow, unfocusAll } = useWindowManager()

  const items: FileItem[] = [
    { name: 'My Pictures', icon: Icons.DIRECTORY_PICTURES, type: 'folder', modified: '3/21/2026', onOpen: () => openWindow('photos') },
    { name: 'My Music', icon: FileIcons.FOLDER, type: 'folder', modified: '3/21/2026' },
    { name: 'resume.doc', icon: FileIcons.DOCUMENT, type: 'file', size: '24 KB', modified: '3/21/2026', onOpen: () => openWindow('documentviewer', { props: { defaultContent: '/data/Ethan_Shealey_Resume.docx.pdf' } }) },
    { name: 'notes.txt', icon: FileIcons.DOCUMENT, type: 'file', size: '2 KB', modified: '3/20/2026', onOpen: () => openWindow('notepad', { title: 'notes.txt', props: { defaultContent: NOTE_CONTENT } }) },
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
