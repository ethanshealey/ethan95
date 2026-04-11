'use client';

import React, { useEffect, useState } from 'react';
import { Button, TextInput } from 'react95';
import { APPLICATIONS } from '.';
import { useWindowManager } from '../hooks/useWindowManager';

interface RunProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

export default function Run({ windowId, focusWindow, defaultContent }: RunProps) {

    const { openWindow, closeWindow } = useWindowManager();
    const [text, setText] = useState<string>(defaultContent || '');

    useEffect(() => {
        document.getElementById(windowId)?.focus();
    }, [])


    const submit = () => {
        const progName = text.toUpperCase().replace(/\.EXE$/, '');
        const app = APPLICATIONS.find(a => a.id.toUpperCase() === progName);
        if (app) {
            openWindow(app.id);
            return ['Opening program ' + app.name + '...'];
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', minWidth: 320 }} onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <div style={{ display: 'flex' }}>
                <TextInput value={text} placeholder='Enter a Program...' onChange={(e) => setText(e.target.value)} fullWidth />
                <Button onClick={submit} style={{ marginLeft: 4 }}>
                    Run
                </Button>
            </div>
        </div>
    );
}
