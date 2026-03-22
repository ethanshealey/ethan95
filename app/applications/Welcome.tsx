'use client';

import React, { useEffect, useState } from 'react';
import { Button, Frame } from 'react95';
import { Icons } from '../icons/icons';

interface WelcomeProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

export default function Welcome({ windowId, focusWindow }: WelcomeProps) {

    useEffect(() => {
        document.getElementById(windowId)?.focus();
    }, [])

    return (
        <div className="app-content" style={{ padding: '5px 10px', overflow: 'hidden' }} onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <h1 style={{ fontWeight: 'lighter' }}>Welcome to <span style={{ fontWeight: 'bold' }}>Ethan</span><span style={{ color: '#000000' }}>95</span></h1>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: '100%', marginTop: '-60px' }}>
                <Frame
                    variant='field'
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        width: '65%',
                        height: '200px',
                        marginBottom: '20px',
                        backgroundColor: '#fcfcb7',
                    }}
                >
                    <div style={{ height: '100%', paddingTop: '50px' }}>
                        <img src={Icons.HELP_QUESTION_MARK} style={{ marginLeft: '10px' }} />
                    </div>
                    <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: '35px' }}>
                        <h4>Did you know...</h4>
                        <p style={{ marginTop: '-10px' }}>My name is Ethan </p>
                    </div>
                </Frame>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '200px', width: '35%', marginBottom: '20px' }}>
                    <Button style={{ marginBottom: '5px', width: '80%' }}>What's&nbsp;<u>N</u>ew</Button>
                    <Button style={{ marginBottom: '5px', width: '80%' }}>Next&nbsp;<u>T</u>ip</Button>
                </div>
            </div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '-80px' }}>
                <div style={{ width: '35%', display: 'flex', justifyContent: 'center' }}>
                    <Button style={{ width: '100px' }}>Close</Button>
                </div>
            </div>
        </div>
    );
}
