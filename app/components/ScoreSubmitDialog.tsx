'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, TextInput } from 'react95';
import { useWindowActions } from '../hooks/useWindowManager';

export type ScoreGame = 'minesweeper' | 'solitaire' | 'sudoku' | 'freecell' | 'wordle';

interface ScoreSubmitDialogProps {
  windowId: string;
  focusWindow: (id: string) => void;
  game: ScoreGame;
  title: string;
  message: React.ReactNode;
  /** Whether the win being submitted is plausible; if false, submission is rejected as cheating. */
  valid: boolean;
  /** Extra game-specific fields (e.g. time, difficulty, guesses) sent with the token request and submission. */
  extraFields?: Record<string, unknown>;
  minWidth?: number;
  autoFocusInput?: boolean;
}

export default function ScoreSubmitDialog({
  windowId, focusWindow, game, title, message, valid, extraFields = {}, minWidth = 280, autoFocusInput = false,
}: ScoreSubmitDialogProps) {
  const { closeWindow } = useWindowActions();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId);
    if (autoFocusInput) inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const tokenRes = await fetch('/api/score/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, ...extraFields }),
    });
    const { token } = await tokenRes.json();

    if (!valid || !name.trim() || !token) {
      alert('No cheating ;)');
      setSubmitting(false);
      return;
    }

    const secret = process.env.NEXT_PUBLIC_SCORE_SECRET!;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(token));
    const secureToken = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const res = await fetch('/api/score', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, username: name, token, secureToken, ...extraFields }),
    });
    const data = await res.json();

    if (data.success) {
      setSubmitted(true);
      closeWindow(windowId);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', minWidth }}
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      <h1 style={{ margin: 0, fontSize: 14 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 12 }}>{message}</p>
      <div style={{ display: 'flex' }}>
        <TextInput
          ref={inputRef}
          value={name}
          placeholder='Enter your name...'
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          fullWidth
        />
        <Button onClick={submit} style={{ marginLeft: 4 }} disabled={submitted || submitting || !name.trim()}>
          Submit
        </Button>
      </div>
    </div>
  );
}
