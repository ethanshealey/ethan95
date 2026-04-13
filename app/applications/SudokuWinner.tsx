'use client';

import React, { useEffect, useState } from 'react';
import { Button, TextInput } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';

interface SudokuWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
  difficulty?: string;
  time?: number;
}

export default function SudokuWinner({ windowId, focusWindow, won, difficulty, time }: SudokuWinnerProps) {
  const { closeWindow } = useWindowManager();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId);
  }, []);

  const submit = async () => {
    const res = await fetch('/api/sudoku/token', { method: 'POST' });
    const { token } = await res.json();

    if (!won || !difficulty?.trim() || !name.trim() || !token) {
      alert('No cheating ;)');
      return;
    }

    const secret = process.env.NEXT_PUBLIC_SCORE_SECRET!;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
    const secureToken = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    await fetch('/api/sudoku', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, difficulty, time, token, secureToken }),
    });

    setSubmitted(true);
    closeWindow(windowId);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', minWidth: 280 }}
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      <h1 style={{ margin: 0, fontSize: 14 }}>Congratulations, You solved it!</h1>
      <p style={{ margin: 0, fontSize: 12 }}>You solved {difficulty?.charAt(0).toUpperCase()}{difficulty?.slice(1)} in {time}s! Enter your name to save your win to the leaderboard.</p>
      <div style={{ display: 'flex' }}>
        <TextInput
          value={name}
          placeholder='Enter your name...'
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          fullWidth
        />
        <Button onClick={submit} style={{ marginLeft: 4 }} disabled={submitted}>
          Submit
        </Button>
      </div>
    </div>
  );
}
