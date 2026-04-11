'use client';

import React, { useEffect, useState } from 'react';
import { AppBar, Button, TextInput, Toolbar } from 'react95';
import { Icons } from '../icons/icons';

interface WeatherProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

export default function Weather({ windowId, focusWindow, defaultContent }: WeatherProps) {

    const [inputValue, setInputValue] = useState(defaultContent ?? '')

    useEffect(() => {
        document.getElementById(windowId)?.focus();
    }, [])

    const search = (target = inputValue) => {

    }

    return (
        <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <AppBar style={{ position: 'static', display: 'flex' }}>
                <Toolbar style={{ gap: 4, padding: '2px 4px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Location:</span>
                    <TextInput
                        value={inputValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') search() }}
                        style={{ flex: 1, fontSize: '12px' }}
                    />
                    <Button onClick={() => search()} style={{ whiteSpace: 'nowrap' }}>Go</Button>
                </Toolbar>
            </AppBar>

            <img src={Icons.MEDIA_PLAYER_STREAM_SUN4} width={250}/>

        </div>
    );
}
