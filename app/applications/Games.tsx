'use client';

import { useEffect } from 'react';
import FileSystem, { FileItem } from '../components/FileSystem';
import { Icons } from '../icons/icons';
import { useWindowManager } from '../hooks/useWindowManager';

interface GamesProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

export default function Games({ windowId, focusWindow }: GamesProps) {

    const { openWindow, unfocusAll } = useWindowManager()

    const items: FileItem[] = [
        { name: 'Minesweeper', icon: Icons.MINESWEEPER, type: 'file', modified: '3/21/2026', onOpen: () => openWindow('minesweeper', { props: {  } }) },
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
