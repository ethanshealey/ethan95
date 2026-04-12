'use client';

import React, { useEffect, useState } from 'react';
import { Button, TextInput } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';

interface MinesweeperWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  time?: number;
  difficulty?: string;
  token?: string;
}

export default function MinesweeperWinner({ windowId, focusWindow, time, difficulty }: MinesweeperWinnerProps) {

  const { closeWindow } = useWindowManager();

  const [text, setText] = useState<string>('');

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId)
  }, [])

  const submit = async () => {

    const tokenRes = await fetch('/api/minesweeper/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: time, difficulty }),
    });
    const { token } = await tokenRes.json();

    if(!time || !difficulty?.trim() || !token) {
      alert('No cheating ;)')
      return
    }

    const secret = process.env.NEXT_PUBLIC_SCORE_SECRET!;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
    const secureToken = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Save to DB
    const res: Response = await fetch('/api/minesweeper', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: text, time, difficulty, token, secureToken }),
    });

    const data = await res.json();

    if(data.success)
      closeWindow(windowId);
  } 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', minWidth: 320 }} onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <h1 style={{ margin: 0, fontSize: 14 }}>Congratulations, You won!</h1>
      <p style={{ margin: 0 }}>You beat {difficulty?.charAt(0).toUpperCase()}{difficulty?.slice(1)} in {time} seconds!</p>
      <div style={{ display: 'flex' }}>
        <TextInput value={text} placeholder='Enter your name...' onChange={(e) => setText(e.target.value)} fullWidth />
        <Button onClick={submit} style={{ marginLeft: 4 }}>
          Submit
        </Button>
      </div>
    </div>
  );
}
