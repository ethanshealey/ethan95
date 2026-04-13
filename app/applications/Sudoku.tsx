'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Frame, MenuList, MenuListItem, Separator, Toolbar } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';
import { useIsMobile } from '../hooks/useIsMobile';

// ─── Types ─────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';
type Board = number[][];

interface SudokuGame {
  solution: Board;
  puzzle: Board;
  given: boolean[][];
}

// ─── Puzzle Generation ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlace(board: Board, row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false;
  return true;
}

function solve(board: Board, randomize: boolean): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const nums = randomize ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const n of nums) {
        if (canPlace(board, r, c, n)) {
          board[r][c] = n;
          if (solve(board, randomize)) return true;
          board[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

const CLUE_COUNTS: Record<Difficulty, number> = { easy: 45, medium: 35, hard: 25 };

function generatePuzzle(difficulty: Difficulty): SudokuGame {
  const solution: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(solution, true);

  const puzzle: Board = solution.map(r => [...r]);
  const given: boolean[][] = Array.from({ length: 9 }, () => Array(9).fill(true));

  const toRemove = 81 - CLUE_COUNTS[difficulty];
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => ({ row: Math.floor(i / 9), col: i % 9 })),
  );

  for (let i = 0; i < toRemove; i++) {
    const { row, col } = positions[i];
    puzzle[row][col] = 0;
    given[row][col] = false;
  }

  return { solution, puzzle, given };
}

// ─── Conflict / completion helpers ─────────────────────────────────────────

function cellHasConflict(board: Board, row: number, col: number): boolean {
  const num = board[row][col];
  if (num === 0) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === num) return true;
    if (i !== row && board[i][col] === num) return true;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if ((r !== row || c !== col) && board[r][c] === num) return true;
  return false;
}

function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] === 0 || cellHasConflict(board, r, c)) return false;
  return true;
}

// ─── Layout constants ───────────────────────────────────────────────────────

const BASE_CELL = 36;
// Frame variant='well' adds ~2px border each side → 4px total per axis.
// Outer margin: 8px each side → 16px. Total overhead per axis: 20px.
const BOARD_OVERHEAD = 20;

// ─── Component ─────────────────────────────────────────────────────────────

interface SudokuProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function Sudoku({ windowId, focusWindow }: SudokuProps) {
  const [game, setGame] = useState<SudokuGame>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Board>(() => game.puzzle.map(r => [...r]));
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showMenu, setShowMenu] = useState(false);
  const [timer, setTimer] = useState(0);
  const [cellSize, setCellSize] = useState(BASE_CELL);

  const menuRef        = useRef<HTMLDivElement>(null);
  const wrapperRef     = useRef<HTMLDivElement>(null);
  const boardFrameRef  = useRef<HTMLDivElement>(null);
  const numpadRef      = useRef<HTMLDivElement>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const wonHandledRef  = useRef(false);

  const { openWindow } = useWindowManager();
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const won = isBoardComplete(board);

  // ─── Responsive cell size ────────────────────────────────────────────────
  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.getBoundingClientRect().width;
      if (w < 10) return;
      const maxFromWidth = Math.floor((w - BOARD_OVERHEAD) / 9);

      if (!isMobileRef.current) {
        // Desktop: scale down only — don't exceed natural cell size
        setCellSize(Math.min(BASE_CELL, Math.max(20, maxFromWidth)));
        return;
      }

      // Mobile: fill width, but cap so the numpad stays on screen
      const boardTop = boardFrameRef.current?.getBoundingClientRect().top ?? 0;
      const numpadH  = numpadRef.current?.offsetHeight ?? 240;
      const maxFromHeight = Math.floor((window.innerHeight - boardTop - numpadH - 75) / 9);
      console.log(Math.max(20, Math.min(maxFromWidth, maxFromHeight)))
      setCellSize(Math.max(20, Math.min(maxFromWidth, maxFromHeight)));
    };

    const obs = new ResizeObserver(compute);
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    // Also recompute on viewport resize — catches the mobile ↔ desktop
    // breakpoint crossing where the window switches between fitContent
    // and full-screen before the ResizeObserver fires.
    window.addEventListener('resize', compute);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  // ─── Focus on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, []);

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (won) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [won]);

  // ─── Win detection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (won && !wonHandledRef.current) {
      wonHandledRef.current = true;
      openWindow('sudoku-winner');
    }
  }, [won]);

  // ─── Close menu on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // ─── Keyboard input ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      const { row, col } = selected;

      if (e.key === 'ArrowUp')    { setSelected(s => s && s.row > 0 ? { row: s.row - 1, col: s.col } : s); return; }
      if (e.key === 'ArrowDown')  { setSelected(s => s && s.row < 8 ? { row: s.row + 1, col: s.col } : s); return; }
      if (e.key === 'ArrowLeft')  { setSelected(s => s && s.col > 0 ? { row: s.row, col: s.col - 1 } : s); return; }
      if (e.key === 'ArrowRight') { setSelected(s => s && s.col < 8 ? { row: s.row, col: s.col + 1 } : s); return; }

      if (game.given[row][col]) return;

      if (e.key >= '1' && e.key <= '9') placeNumber(parseInt(e.key), row, col);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') placeNumber(0, row, col);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, game]);

  const placeNumber = useCallback((num: number, row: number, col: number) => {
    setHistory(h => [...h, board.map(r => [...r])]);
    setBoard(b => {
      const nb = b.map(r => [...r]);
      nb[row][col] = num;
      return nb;
    });
  }, [board]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      setBoard(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const newGame = useCallback((diff?: Difficulty) => {
    const d = diff ?? difficulty;
    if (diff) setDifficulty(d);
    const g = generatePuzzle(d);
    setGame(g);
    setBoard(g.puzzle.map(r => [...r]));
    setHistory([]);
    setSelected(null);
    setTimer(0);
    setShowMenu(false);
    wonHandledRef.current = false;
  }, [difficulty]);

  // ─── Cell helpers ────────────────────────────────────────────────────────
  const isRelated = (r: number, c: number): boolean => {
    if (!selected) return false;
    return r === selected.row || c === selected.col ||
      (Math.floor(r / 3) === Math.floor(selected.row / 3) &&
       Math.floor(c / 3) === Math.floor(selected.col / 3));
  };

  const getCellStyle = (r: number, c: number): React.CSSProperties => {
    const isSel    = selected?.row === r && selected?.col === c;
    const related  = !isSel && isRelated(r, c);
    const isGiven  = game.given[r][c];
    const conflict = cellHasConflict(board, r, c);
    const fontSize = Math.max(10, Math.round(cellSize * 0.44));

    return {
      width: cellSize,
      height: cellSize,
      textAlign: 'center',
      verticalAlign: 'middle',
      fontSize,
      fontWeight: isGiven ? 'bold' : 'normal',
      fontFamily: 'Arial, sans-serif',
      cursor: 'pointer',
      touchAction: 'manipulation',
      backgroundColor: isSel ? '#000080' : related ? '#c8d8e8' : isGiven ? '#c0c0c0' : '#ffffff',
      color: isSel ? '#ffffff' : conflict ? '#cc0000' : isGiven ? '#000000' : '#000080',
      borderTop:    r % 3 === 0 ? '2px solid #000000' : '1px solid #808080',
      borderLeft:   c % 3 === 0 ? '2px solid #000000' : '1px solid #808080',
      borderBottom: r === 8     ? '2px solid #000000' : 'none',
      borderRight:  c === 8     ? '2px solid #000000' : 'none',
      boxSizing: 'border-box',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    };
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const diffLabel = (d: Difficulty) => d.charAt(0).toUpperCase() + d.slice(1);

  const canEdit = selected && !game.given[selected.row][selected.col];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className="app-content"
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
    >
      {/* ── Toolbar ── */}
      <Toolbar style={{ display: 'flex', alignItems: 'center' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button variant='menu' size='sm' onClick={() => setShowMenu(v => !v)}>Game</Button>
          {showMenu && (
            <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 2000, minWidth: 160 }}>
              <MenuListItem style={{ cursor: 'pointer' }} onClick={() => newGame()}>
                New Game
              </MenuListItem>
              <Separator />
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <MenuListItem
                  key={d}
                  style={{ cursor: 'pointer', fontWeight: difficulty === d ? 'bold' : 'normal' }}
                  onClick={() => newGame(d)}
                >
                  {diffLabel(d)}
                </MenuListItem>
              ))}
              <Separator />
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { openWindow('sudoku-leaderboard'); setShowMenu(false); }}
              >
                Leaderboard
              </MenuListItem>
            </MenuList>
          )}
        </div>
        <Button variant='menu' size='sm' onClick={undo} disabled={history.length === 0}>
          Undo
        </Button>
        <span style={{ marginLeft: 'auto', marginRight: 8, fontSize: 13, fontFamily: 'monospace', alignSelf: 'center' }}>
          {formatTime(timer)}
        </span>
      </Toolbar>

      {/* ── Board ── */}
      <div ref={boardFrameRef} style={{ display: 'inline-block' }}>
      <Frame
        variant='well'
        style={{ display: 'inline-block', margin: '8px 8px 4px', touchAction: 'none' }}
      >
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {board.map((row, r) => (
              <tr key={r}>
                {row.map((value, c) => (
                  <td
                    key={c}
                    style={getCellStyle(r, c)}
                    onClick={() => setSelected({ row: r, col: c })}
                  >
                    {value !== 0 ? value : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Frame>
      </div>

      {/* ── Number pad ── */}
      <div ref={numpadRef}>
      {isMobile ? (
        // 3×3 grid with full-width erase — phone numpad style
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '4px 8px 12px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <Button
              key={n}
              size='sm'
              style={{ minWidth: 0, padding: 0, height: 56, fontSize: 20, touchAction: 'manipulation' }}
              disabled={!canEdit}
              onClick={() => canEdit && placeNumber(n, selected!.row, selected!.col)}
            >
              {n}
            </Button>
          ))}
          <Button
            size='sm'
            style={{ gridColumn: '1 / -1', minWidth: 0, padding: 0, height: 44, fontSize: 15, touchAction: 'manipulation' }}
            disabled={!canEdit}
            onClick={() => canEdit && placeNumber(0, selected!.row, selected!.col)}
          >
            Erase
          </Button>
        </div>
      ) : (
        // Single row on desktop
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, padding: '4px 8px 8px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <Button
              key={n}
              size='sm'
              style={{ minWidth: 0, padding: 0, height: 28, fontSize: 13, touchAction: 'manipulation' }}
              disabled={!canEdit}
              onClick={() => canEdit && placeNumber(n, selected!.row, selected!.col)}
            >
              {n}
            </Button>
          ))}
          <Button
            size='sm'
            style={{ minWidth: 0, padding: 0, height: 28, fontSize: 11, touchAction: 'manipulation' }}
            disabled={!canEdit}
            onClick={() => canEdit && placeNumber(0, selected!.row, selected!.col)}
          >
            ✕
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
