'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, MenuList, MenuListItem, Separator, Toolbar } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';
import { useIsMobile } from '../hooks/useIsMobile';
import { ANSWERS, VALID_GUESSES } from './wordle-words';

interface WordleProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

/** Visual state of a single tile. */
type TileState = 'correct' | 'present' | 'absent' | 'tbd' | 'empty';

interface Tile {
  letter: string;
  state: TileState;
}

type GameStatus = 'playing' | 'won' | 'lost';

const CELL_DESKTOP = 54;
const GAP          = 4;

const QWERTY: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Del'],
];

/** Priority used to merge key states — correct beats present beats absent. */
const STATE_RANK: Partial<Record<TileState, number>> = { correct: 3, present: 2, absent: 1 };

function pickWord(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)].toUpperCase();
}

/** Scores a guess against the answer, returning per-letter states. */
function evaluate(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(5).fill('absent');
  const remaining = answer.split('') as (string | null)[];

  // First pass: correct positions
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      remaining[i] = null;
    }
  }
  // Second pass: present letters
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = 'present';
      remaining[idx] = null;
    }
  }
  return result;
}

function emptyBoard(): Tile[][] {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({ letter: '', state: 'empty' as TileState })),
  );
}

function tileBg(state: TileState): string {
  if (state === 'correct') return '#8fbc8f';
  if (state === 'present') return '#808000';
  if (state === 'absent')  return '#808080';
  if (state === 'tbd')     return '#c0c0c0';
  return '#ffffff';
}

function tileTextColor(state: TileState): string {
  if (state === 'empty' || state === 'tbd' || state === 'correct') return '#000000';
  return '#ffffff';
}

function tileBorderStyle(state: TileState): React.CSSProperties {
  // Win95 sunken border for empty, raised for tbd, flat for evaluated
  if (state === 'empty') return {
    borderTop: '2px solid #808080', borderLeft: '2px solid #808080',
    borderBottom: '2px solid #ffffff', borderRight: '2px solid #ffffff',
  };
  if (state === 'tbd') return {
    borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff',
    borderBottom: '2px solid #808080', borderRight: '2px solid #808080',
  };
  return { border: '2px solid rgba(0,0,0,0.25)' };
}

function ordinalSuffix(n: number): string {
  return ['st', 'nd', 'rd'][n - 1] ?? 'th';
}

export default function Wordle({ windowId, focusWindow }: WordleProps) {
  const [answer, setAnswer]           = useState(pickWord);
  const [board, setBoard]             = useState<Tile[][]>(emptyBoard);
  const [currentRow, setCurrentRow]   = useState(0);
  const [currentCol, setCurrentCol]   = useState(0);
  const [keyStates, setKeyStates]     = useState<Record<string, TileState>>({});
  const [gameStatus, setGameStatus]   = useState<GameStatus>('playing');
  const [wonGuesses, setWonGuesses]   = useState<number | null>(null);
  const [shakeRow, setShakeRow]       = useState<number | null>(null);
  const [message, setMessage]         = useState<string | null>(null);
  const [hardMode, setHardMode]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [cellSize, setCellSize]       = useState(CELL_DESKTOP);

  const menuRef         = useRef<HTMLDivElement>(null);
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const msgTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wonHandledRef   = useRef(false);
  const gameStatusRef   = useRef(gameStatus);
  gameStatusRef.current = gameStatus;
  const isMobile        = useIsMobile();
  const isMobileRef     = useRef(isMobile);
  isMobileRef.current   = isMobile;

  const { openWindow } = useWindowManager();

  const showMessage = useCallback((msg: string, duration = 2000) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMessage(msg);
    msgTimerRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  const newGame = useCallback(() => {
    setAnswer(pickWord());
    setBoard(emptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setKeyStates({});
    setGameStatus('playing');
    setWonGuesses(null);
    setShakeRow(null);
    setMessage(null);
    setShowMenu(false);
    wonHandledRef.current = false;
  }, []);

  // Compute cell size from wrapper width on mobile
  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current) return;
      if (!isMobileRef.current) { setCellSize(CELL_DESKTOP); return; }
      const w = wrapperRef.current.getBoundingClientRect().width;
      if (w < 10) return;
      const fromWidth = Math.floor((w - 32 - GAP * 4) / 5);
      setCellSize(Math.min(68, Math.max(40, fromWidth)));
    };
    const obs = new ResizeObserver(compute);
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    window.addEventListener('resize', compute);
    return () => { obs.disconnect(); window.removeEventListener('resize', compute); };
  }, []);

  // Dismiss menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Open winner window once on win; show answer on loss
  useEffect(() => {
    if (gameStatus === 'won' && wonGuesses !== null && !wonHandledRef.current) {
      wonHandledRef.current = true;
      const t = setTimeout(
        () => openWindow('wordle-winner', { props: { won: true, guesses: wonGuesses } }),
        600,
      );
      return () => clearTimeout(t);
    }
    if (gameStatus === 'lost') {
      showMessage(`The word was ${answer}`, 4000);
    }
  }, [gameStatus, wonGuesses, answer, showMessage, openWindow]);

  const triggerShake = useCallback((row: number) => {
    setShakeRow(row);
    setTimeout(() => setShakeRow(null), 600);
  }, []);

  const addLetter = useCallback((letter: string) => {
    if (gameStatus !== 'playing' || currentCol >= 5) return;
    setBoard(b => {
      const nb = b.map(r => r.map(t => ({ ...t })));
      nb[currentRow][currentCol] = { letter, state: 'tbd' };
      return nb;
    });
    setCurrentCol(c => c + 1);
  }, [gameStatus, currentRow, currentCol]);

  const deleteLetter = useCallback(() => {
    if (gameStatus !== 'playing' || currentCol <= 0) return;
    setBoard(b => {
      const nb = b.map(r => r.map(t => ({ ...t })));
      nb[currentRow][currentCol - 1] = { letter: '', state: 'empty' };
      return nb;
    });
    setCurrentCol(c => c - 1);
  }, [gameStatus, currentRow, currentCol]);

  const submitGuess = useCallback(() => {
    if (gameStatus !== 'playing') return;

    if (currentCol < 5) {
      showMessage('Not enough letters');
      triggerShake(currentRow);
      return;
    }

    const guess = board[currentRow].map(t => t.letter).join('');

    if (!ANSWERS.includes(guess.toLowerCase()) && !VALID_GUESSES.includes(guess.toLowerCase())) {
      showMessage('Not in word list');
      triggerShake(currentRow);
      return;
    }

    // Hard mode: all revealed greens must stay; all revealed yellows must be used
    if (hardMode) {
      for (let row = 0; row < currentRow; row++) {
        for (let c = 0; c < 5; c++) {
          const tile = board[row][c];
          if (tile.state === 'correct' && guess[c] !== tile.letter) {
            showMessage(`${c + 1}${ordinalSuffix(c + 1)} letter must be ${tile.letter}`);
            triggerShake(currentRow);
            return;
          }
        }
        for (let c = 0; c < 5; c++) {
          const tile = board[row][c];
          if (tile.state === 'present' && !guess.includes(tile.letter)) {
            showMessage(`Guess must contain ${tile.letter}`);
            triggerShake(currentRow);
            return;
          }
        }
      }
    }

    const result = evaluate(guess, answer);

    setBoard(b => {
      const nb = b.map(r => r.map(t => ({ ...t })));
      for (let c = 0; c < 5; c++) nb[currentRow][c].state = result[c];
      return nb;
    });

    setKeyStates(ks => {
      const nks = { ...ks };
      for (let c = 0; c < 5; c++) {
        const letter = guess[c];
        const newRank = STATE_RANK[result[c]] ?? 0;
        const curRank = STATE_RANK[nks[letter]] ?? 0;
        if (newRank > curRank) nks[letter] = result[c];
      }
      return nks;
    });

    const won = result.every(s => s === 'correct');
    if (won) {
      setGameStatus('won');
      setWonGuesses(currentRow + 1);
    } else if (currentRow === 5) {
      setGameStatus('lost');
    } else {
      setCurrentRow(r => r + 1);
      setCurrentCol(0);
    }
  }, [gameStatus, currentRow, currentCol, board, answer, hardMode, showMessage, triggerShake]);

  const handleKey = useCallback((key: string) => {
    if (key === 'Enter')              { submitGuess(); return; }
    if (key === 'Del' || key === 'Backspace') { deleteLetter(); return; }
    if (/^[A-Z]$/.test(key))         { addLetter(key); return; }
  }, [submitGuess, deleteLetter, addLetter]);

  // Physical keyboard input — bail out when game is over so other windows can receive input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (gameStatusRef.current !== 'playing') return;
      if (e.key === 'Enter')              { e.preventDefault(); handleKey('Enter'); }
      else if (e.key === 'Backspace')     { e.preventDefault(); handleKey('Del'); }
      else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); handleKey(e.key.toUpperCase()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const getTileStyle = (tile: Tile): React.CSSProperties => ({
    width: cellSize,
    height: cellSize,
    backgroundColor: tileBg(tile.state),
    color: tileTextColor(tile.state),
    ...tileBorderStyle(tile.state),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(14, Math.round(cellSize * 0.44)),
    fontWeight: 'bold',
    fontFamily: "'MS Sans Serif', sans-serif",
    boxSizing: 'border-box',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    letterSpacing: 1,
  });

  const getKeyStyle = (key: string): React.CSSProperties => {
    const state = keyStates[key];
    const isWide = key === 'Enter' || key === 'Del';
    return {
      minWidth: 0,
      padding: 0,
      width: isMobile ? undefined : (isWide ? 54 : 36),
      flex: isMobile ? (isWide ? '1.5 1 0' : '1 1 0') : 'none',
      height: isMobile ? 46 : 46,
      fontSize: key === 'Enter' ? 10 : 14,
      fontWeight: 'bold',
      touchAction: 'manipulation',
      ...(state ? { backgroundColor: tileBg(state), color: tileTextColor(state) } : {}),
    };
  };

  return (
    <div
      ref={wrapperRef}
      className="app-content"
      style={{ position: 'relative' }}
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      <Toolbar style={{ display: 'flex', alignItems: 'center' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button variant='menu' size='sm' onClick={() => setShowMenu(v => !v)}>Game</Button>
          {showMenu && (
            <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 2000, minWidth: 160 }}>
              <MenuListItem style={{ cursor: 'pointer' }} onClick={newGame}>New Game</MenuListItem>
              <Separator />
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { setHardMode(h => !h); setShowMenu(false); }}
              >
                {hardMode ? '✓ ' : ''}Hard Mode
              </MenuListItem>
              <Separator />
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { openWindow('wordle-leaderboard'); setShowMenu(false); }}
              >
                Leaderboard
              </MenuListItem>
            </MenuList>
          )}
        </div>
        {hardMode && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#800000', fontWeight: 'bold' }}>
            ★ Hard Mode
          </span>
        )}
      </Toolbar>

      {/* Toast message */}
      {message && (
        <div style={{
          position: 'absolute',
          top: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#000000',
          color: '#ffffff',
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 'bold',
          zIndex: 3000,
          whiteSpace: 'nowrap',
          border: '1px solid #808080',
          pointerEvents: 'none',
        }}>
          {message}
        </div>
      )}

      {/* Board */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {board.map((row, r) => (
            <div
              key={r}
              className={shakeRow === r ? 'wordle-shake' : undefined}
              style={{ display: 'flex', gap: GAP }}
            >
              {row.map((tile, c) => (
                <div key={c} style={getTileStyle(tile)}>
                  {tile.letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard */}
      <div style={{ padding: '0 8px 12px' }}>
        {QWERTY.map((row, r) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 3 }}>
            {row.map(key => (
              <Button
                key={key}
                size='sm'
                style={getKeyStyle(key)}
                onClick={() => handleKey(key)}
              >
                {key}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
