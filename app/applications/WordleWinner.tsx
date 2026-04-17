'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, TextInput } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';

interface WordleWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
  guesses?: number;
}

export default function WordleWinner({ windowId, focusWindow, won, guesses }: WordleWinnerProps) {
  const { closeWindow } = useWindowManager();
  const [name, setName]           = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    focusWindow(windowId);
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    const res = await fetch('/api/wordle/token', { method: 'POST' });
    const { token } = await res.json();

    if (!won || typeof guesses !== 'number' || !name.trim() || !token) {
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

    await fetch('/api/wordle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, guesses, token, secureToken }),
    });

    setSubmitted(true);
    closeWindow(windowId);
  };

  const plural = guesses === 1 ? 'guess' : 'guesses';

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', minWidth: 280 }}
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      <h1 style={{ margin: 0, fontSize: 14 }}>You got it!</h1>
      <p style={{ margin: 0, fontSize: 12 }}>
        Solved in {guesses} {plural}! Enter your name to save your score.
      </p>
      <div style={{ display: 'flex' }}>
        <TextInput
          ref={inputRef}
          value={name}
          placeholder='Enter your name...'
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          fullWidth
        />
        <Button onClick={submit} style={{ marginLeft: 4 }} disabled={submitted || !name.trim()}>
          Submit
        </Button>
      </div>
    </div>
  );
}
