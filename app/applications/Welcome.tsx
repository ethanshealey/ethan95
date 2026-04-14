'use client';

import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Frame } from 'react95';
import { Icons } from '../icons/icons';
import { useWindowManager } from '../hooks/useWindowManager';

interface WelcomeProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

const TIPS = [
    "My name is Ethan and I'm a full-stack software engineer based in Durham, NC.",
    "You can view some of my friends websites in the Internet Explorer application.",
    "You can view my Résumé in the My Documents application.",
    "This site is built with Next.js and React95.",
    "Double-click any icon on the desktop to open an application.",
    "Try the Command Line app! It supports a handful of classic commands.",
    "You can browse my projects, documents, and photos from the desktop icons.",
];

export default function Welcome({ windowId, focusWindow }: WelcomeProps) {
    const { closeWindow } = useWindowManager();
    const [tipIndex, setTipIndex] = useState(0);
    const [showOnStartup, setShowOnStartup] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('showWelcome');
        if (stored !== null) {
            setShowOnStartup(stored !== 'false');
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('showWelcome', String(showOnStartup));
        closeWindow(windowId);
    };

    const nextTip = () => setTipIndex((i) => (i + 1) % TIPS.length);

    return (
        <div
            className="app-content"
            style={{ padding: 0, overflow: 'hidden' }}
            onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
        >
            {/* Main body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* Left decorative panel */}
                <div style={{
                    width: '150px',
                    minWidth: '150px',
                    background: 'linear-gradient(to bottom, #00007b 0%, #000080 40%, #00009c 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    padding: '10px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Rainbow bands at top */}
                    {['#ff0000', '#ff7f00', '#ffff00', '#00c000', '#00bfff', '#0000ff'].map((color, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            top: i * 9,
                            left: 0,
                            right: 0,
                            height: '9px',
                            background: color,
                            opacity: 0.85,
                        }} />
                    ))}

                    {/* "Windows 95" branding text */}
                    <div style={{ color: 'white', lineHeight: 1.15, userSelect: 'none' }}>
                        <div style={{ fontSize: '19px', fontWeight: 'bold' }}>Ethan</div>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f0d040', letterSpacing: '-1px' }}>95</div>
                    </div>
                </div>

                {/* Right content area */}
                <div style={{ flex: 1, padding: '14px 14px 10px 14px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Title */}
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'lighter' }}>Welcome to </span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Ethan</span>
                        <span style={{ fontSize: '20px', color: '#000080', fontWeight: 'bold' }}>95</span>
                    </div>

                    {/* Tip area */}
                    <Frame
                        variant="field"
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#ffffc8',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: '10px',
                            marginBottom: '10px',
                            overflow: 'hidden',
                        }}
                    >
                        <img src={Icons.HELP_QUESTION_MARK} alt="tip" style={{ flexShrink: 0, marginTop: '2px', width: '32px', height: '32px' }} />
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>Did you know...</div>
                            <div style={{ fontSize: '11px', lineHeight: 1.5 }}>{TIPS[tipIndex]}</div>
                        </div>
                    </Frame>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button style={{ width: '100px', fontSize: '11px' }}>What's&nbsp;<u>N</u>ew</Button>
                        <Button style={{ width: '100px', fontSize: '11px' }} onClick={nextTip}>Next&nbsp;<u>T</u>ip</Button>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{
                borderTop: '1px solid #808080',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                backgroundColor: '#c0c0c0',
            }}>
                <Checkbox
                    checked={showOnStartup}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowOnStartup(e.target.checked)}
                    label="Show this screen at startup"
                    name="show-welcome"
                />
                <Button style={{ width: '80px', fontSize: '11px' }} onClick={handleClose}>Close</Button>
            </div>
        </div>
    );
}
