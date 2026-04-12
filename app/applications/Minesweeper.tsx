'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import localFont from 'next/font/local';
import { Button, Frame, MenuList, MenuListItem, Radio, ScrollView, Separator, TextInput, Toolbar } from 'react95';
import { Icons } from '../icons/icons';
import MinesweeperGrid, { CELL_SIZE } from '../components/minesweeper/MinesweeperGrid';
import { useWindowManager } from '../hooks/useWindowManager';
import { Difficulty, GRID_COLS, GRID_ROWS, MINE_COUNTS, generateGrid, floodReveal, checkWin } from '../components/minesweeper/utils/MinesweeperUtils';
import { generateRoomId, createRoom, joinRoom, subscribeToRoom, syncPlayerState, syncSharedState, restartRoom, Room, RoomMode } from '../../lib/minesweeperRoom';

const dseg7 = localFont({
    src: [
        { path: '../fonts/DSEG7Classic-Regular.woff2', weight: '400' },
        { path: '../fonts/DSEG7Classic-Bold.woff2', weight: '700' },
    ],
    variable: '--font-dseg7',
});

const SMILE = '/static/images/minesweeper/smile.png';
const DEAD  = '/static/images/minesweeper/dead.png';

interface MinesweeperProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

const CHROME_W       = 26;
const CHROME_H       = 155;
const OPPONENT_BAR_H = 24;

function calcSize(difficulty: Difficulty, multiplayer: boolean) {
    return {
        w: GRID_COLS[difficulty] * CELL_SIZE + CHROME_W,
        h: GRID_ROWS[difficulty] * CELL_SIZE + CHROME_H + (multiplayer ? OPPONENT_BAR_H : 0),
    };
}

function blankRevealed(difficulty: Difficulty): number[][] {
    return Array.from({ length: GRID_ROWS[difficulty] }, () => Array(GRID_COLS[difficulty]).fill(0));
}

function progressPct(grid: number[][], revealed: number[][]): number {
    let total = 0, done = 0;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] !== -1) { total++; if (revealed[r][c] === 1) done++; }
        }
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function Minesweeper({ windowId, focusWindow }: MinesweeperProps) {

    const { openWindow, setSize } = useWindowManager();

    // ── Single-player state ──────────────────────────────────────────────────
    const [difficulty, setDifficulty]                 = useState<Difficulty>('beginner');
    const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
    const [grid, setGrid]                             = useState<number[][]>([]);
    const [revealed, setRevealed]                     = useState<number[][]>([]);
    const [flagCount, setFlagCount]                   = useState<number>(0);
    const [timer, setTimer]                           = useState<number>(0);
    const [lostCell, setLostCell]                     = useState<{ x: number; y: number } | null>(null);
    const [won, setWon]                               = useState<boolean>(false);
    const [gameStarted, setGameStarted]               = useState<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const menuRef  = useRef<HTMLDivElement>(null);

    // ── Multiplayer state ────────────────────────────────────────────────────
    const [roomId, setRoomId]               = useState<string | null>(null);
    const [playerRole, setPlayerRole]       = useState<'host' | 'guest' | null>(null);
    const [roomStatus, setRoomStatus]       = useState<'waiting' | 'playing' | null>(null);
    const [mode, setMode]                   = useState<RoomMode>('versus');
    const [opponentStats, setOpponentStats] = useState<{ timer: number; flagCount: number; result: string; revealed: string } | null>(null);
    const [showModeModal, setShowModeModal]   = useState(false); // pre-creation: pick mode
    const [showStartModal, setShowStartModal] = useState(false); // post-creation: show room code
    const [showJoinModal, setShowJoinModal]   = useState(false);
    const [joinCode, setJoinCode]           = useState('');
    const [joinError, setJoinError]         = useState('');
    const [startingRoom, setStartingRoom]   = useState(false);
    const [joiningRoom, setJoiningRoom]     = useState(false);

    // Stable refs - subscription callback must never capture stale state
    const playerRoleRef = useRef<'host' | 'guest' | null>(null);
    const roomStatusRef = useRef<'waiting' | 'playing' | null>(null);
    const modeRef       = useRef<RoomMode>('versus');
    const lostCellRef   = useRef<{ x: number; y: number } | null>(null);
    const unsubRef      = useRef<(() => void) | null>(null);
    const roundRef      = useRef<number>(0);

    // ── Reset local state for a new round (restart) ─────────────────────────
    const resetForNewRound = useCallback((room: Room) => {
        roundRef.current = room.round ?? 0;
        const roomGrid = JSON.parse(room.grid) as number[][];
        const d = room.difficulty;
        const initRevealed = room.mode === 'coop' && room.shared
            ? JSON.parse(room.shared.revealed) as number[][]
            : blankRevealed(d);
        const initFlagCount = room.mode === 'coop' && room.shared
            ? room.shared.flagCount
            : MINE_COUNTS[d];
        setGrid(roomGrid);
        setRevealed(initRevealed);
        setFlagCount(initFlagCount);
        setTimer(0);
        setLostCell(null);
        lostCellRef.current = null;
        setWon(false);
        setGameStarted(true);
        setOpponentStats(null);
    }, []);

    // ── Room subscription handler ────────────────────────────────────────────
    const handleRoomUpdate = useCallback((room: Room) => {
        // Detect restart (round increment)
        const newRound = room.round ?? 0;
        if (newRound > roundRef.current) {
            resetForNewRound(room);
            return;
        }

        // Host: detect when guest joins
        if (playerRoleRef.current === 'host' && room.status === 'playing' && roomStatusRef.current === 'waiting') {
            roomStatusRef.current = 'playing';
            setRoomStatus('playing');
            setShowStartModal(false);
            setGameStarted(true);
        }

        if (modeRef.current === 'coop') {
            // Coop: drive local board from shared state
            if (room.shared) {
                const sharedRevealed = JSON.parse(room.shared.revealed) as number[][];
                setRevealed(sharedRevealed);
                setFlagCount(room.shared.flagCount);
                if (room.shared.result === 'won') {
                    setWon(true);
                }
                if (room.shared.result === 'lost' && room.shared.lostCell && !lostCellRef.current) {
                    const cell = JSON.parse(room.shared.lostCell) as { x: number; y: number };
                    lostCellRef.current = cell;
                    setLostCell(cell);
                }
            }
        } else {
            // Versus: track opponent's individual state for the status bar
            const opRole = playerRoleRef.current === 'host' ? 'guest' : 'host';
            const opState = room[opRole];
            if (opState) {
                setOpponentStats({
                    timer: opState.timer,
                    flagCount: opState.flagCount,
                    result: opState.result,
                    revealed: opState.revealed,
                });
            }
        }
    }, [resetForNewRound]);

    // ── Leave / cleanup room ─────────────────────────────────────────────────
    const leaveRoom = useCallback(() => {
        unsubRef.current?.();
        unsubRef.current      = null;
        playerRoleRef.current = null;
        roomStatusRef.current = null;
        lostCellRef.current   = null;
        setRoomId(null);
        setPlayerRole(null);
        setRoomStatus(null);
        setOpponentStats(null);
        setShowModeModal(false);
        setShowStartModal(false);
        setShowJoinModal(false);
    }, []);

    // ── Start new single-player game ─────────────────────────────────────────
    const startNewGame = useCallback((diff?: Difficulty) => {
        if (timerRef.current) clearInterval(timerRef.current);
        leaveRoom();
        const d = diff ?? difficulty;
        setGrid(Array.from({ length: GRID_ROWS[d] }, () => Array(GRID_COLS[d]).fill(0)));
        setRevealed(blankRevealed(d));
        setFlagCount(MINE_COUNTS[d]);
        setTimer(0);
        setLostCell(null);
        setWon(false);
        setGameStarted(false);
        setShowDifficultyMenu(false);
    }, [difficulty, leaveRoom]);

    // ── Difficulty / resize effect ───────────────────────────────────────────
    useEffect(() => {
        if (roomId) return;
        const { w, h } = calcSize(difficulty, false);
        setSize(windowId, w, h);
        startNewGame(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [difficulty]);

    // ── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!gameStarted || lostCell || won) return;
        timerRef.current = setInterval(() => setTimer(t => Math.min(t + 1, 999)), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameStarted, lostCell, won]);

    // ── Sync timer to RTDB (versus only) ─────────────────────────────────────
    useEffect(() => {
        if (!roomId || !playerRole || roomStatus !== 'playing' || modeRef.current === 'coop') return;
        syncPlayerState(roomId, playerRole, { timer });
    }, [timer, roomId, playerRole, roomStatus]);

    // ── Click-outside to close Game menu ────────────────────────────────────
    useEffect(() => {
        if (!showDifficultyMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setShowDifficultyMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDifficultyMenu]);

    // ── Cell click ───────────────────────────────────────────────────────────
    const onCellClick = async (x: number, y: number) => {
        if (!grid.length || revealed[y][x] !== 0 || lostCell || won) return;

        let currentGrid = grid;
        if (!gameStarted) {
            if (!roomId) {
                const { grid: newGrid } = generateGrid(difficulty, { r: y, c: x });
                setGrid(newGrid);
                currentGrid = newGrid;
            }
            setGameStarted(true);
        }

        const isCoop = modeRef.current === 'coop';

        if (currentGrid[y][x] === -1) {
            const newRevealed = currentGrid.map((row, r) => row.map((_, c) => revealed[r][c] === 2 ? 2 : 1));
            setRevealed(newRevealed);
            setLostCell({ x, y });
            lostCellRef.current = { x, y };

            if (roomId) {
                if (isCoop) {
                    await syncSharedState(roomId, {
                        revealed: JSON.stringify(newRevealed),
                        result: 'lost',
                        flagCount,
                        timer,
                        lostCell: JSON.stringify({ x, y }),
                    });
                } else if (playerRole) {
                    await syncPlayerState(roomId, playerRole, { revealed: JSON.stringify(newRevealed), result: 'lost' });
                }
            }
            return;
        }

        const newRevealed = floodReveal(x, y, currentGrid, revealed);
        setRevealed(newRevealed);

        if (roomId) {
            if (isCoop) {
                await syncSharedState(roomId, { revealed: JSON.stringify(newRevealed), flagCount, timer });
            } else if (playerRole) {
                await syncPlayerState(roomId, playerRole, { revealed: JSON.stringify(newRevealed) });
            }
        }

        if (checkWin(currentGrid, newRevealed)) {
            setWon(true);
            if (roomId) {
                if (isCoop) {
                    await syncSharedState(roomId, { revealed: JSON.stringify(newRevealed), result: 'won', flagCount, timer });
                } else if (playerRole) {
                    await syncPlayerState(roomId, playerRole, { revealed: JSON.stringify(newRevealed), result: 'won', timer });
                }
                return;
            }
            // Single-player win
            const winTime = timer;
            const res = await fetch('/api/minesweeper/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time: winTime, difficulty }),
            });
            const { token } = await res.json();
            openWindow('minesweeper-winner', { props: { time: winTime, difficulty, token } });
        }
    };

    const onCellRightClick = async (x: number, y: number) => {
        if (!grid.length) return;
        const isCoop = modeRef.current === 'coop';
        let newRevealed = revealed;
        let newFlagCount = flagCount;

        if (revealed[y][x] === 0) {
            if (flagCount === 0) return;
            newRevealed = revealed.map((row, r) => row.map((cell, c) => r === y && c === x ? 2 : cell));
            newFlagCount = flagCount - 1;
            setRevealed(newRevealed);
            setFlagCount(newFlagCount);
        } else if (revealed[y][x] === 2) {
            newRevealed = revealed.map((row, r) => row.map((cell, c) => r === y && c === x ? 0 : cell));
            newFlagCount = flagCount + 1;
            setRevealed(newRevealed);
            setFlagCount(newFlagCount);
        } else {
            return;
        }

        if (roomId) {
            if (isCoop) {
                await syncSharedState(roomId, { revealed: JSON.stringify(newRevealed), flagCount: newFlagCount, timer });
            } else if (playerRole) {
                await syncPlayerState(roomId, playerRole, { revealed: JSON.stringify(newRevealed), flagCount: newFlagCount });
            }
        }
    };

    // ── Start Room ───────────────────────────────────────────────────────────
    const handleStartRoom = async () => {
        setStartingRoom(true);
        try {
            const id = generateRoomId();
            const { grid: newGrid } = generateGrid(difficulty); // no safe-cell in multiplayer
            const initRevealed = blankRevealed(difficulty);
            const hostState = {
                revealed: JSON.stringify(initRevealed),
                flagCount: MINE_COUNTS[difficulty],
                timer: 0,
                result: 'playing' as const,
            };
            const sharedState = mode === 'coop' ? { ...hostState } : undefined;

            await createRoom(id, difficulty, mode, newGrid, hostState, sharedState);

            setGrid(newGrid);
            setRevealed(initRevealed);
            setFlagCount(MINE_COUNTS[difficulty]);
            setTimer(0);
            setLostCell(null);
            setWon(false);
            setGameStarted(false);
            lostCellRef.current   = null;
            roundRef.current      = 0;
            modeRef.current       = mode;
            playerRoleRef.current = 'host';
            roomStatusRef.current = 'waiting';
            setRoomId(id);
            setPlayerRole('host');
            setRoomStatus('waiting');
            setShowDifficultyMenu(false);
            setShowStartModal(true);

            unsubRef.current = subscribeToRoom(id, handleRoomUpdate);

            const { w, h } = calcSize(difficulty, true);
            setSize(windowId, w, h);
        } finally {
            setStartingRoom(false);
        }
    };

    // ── Join Room ────────────────────────────────────────────────────────────
    const handleJoinRoom = async () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) { setJoinError('Enter a valid 6-character room code.'); return; }
        setJoiningRoom(true);
        setJoinError('');
        try {
            const placeholderState = {
                revealed: JSON.stringify(blankRevealed('beginner')),
                flagCount: 0,
                timer: 0,
                result: 'playing' as const,
            };
            const room = await joinRoom(code, placeholderState);
            if (!room) { setJoinError('Room not found or already in progress.'); return; }

            const d = room.difficulty;
            const roomGrid = JSON.parse(room.grid) as number[][];
            const roomMode = room.mode ?? 'versus';

            // For coop: use whatever is already in shared state; for versus: blank board
            const initRevealed = roomMode === 'coop' && room.shared
                ? JSON.parse(room.shared.revealed) as number[][]
                : blankRevealed(d);
            const initFlagCount = roomMode === 'coop' && room.shared
                ? room.shared.flagCount
                : MINE_COUNTS[d];

            if (roomMode === 'versus') {
                await syncPlayerState(code, 'guest', {
                    revealed: JSON.stringify(initRevealed),
                    flagCount: initFlagCount,
                    timer: 0,
                    result: 'playing',
                });
            }

            setDifficulty(d);
            setGrid(roomGrid);
            setRevealed(initRevealed);
            setFlagCount(initFlagCount);
            setTimer(0);
            setLostCell(null);
            setWon(false);
            setGameStarted(true);
            lostCellRef.current   = null;
            roundRef.current      = room.round ?? 0;
            modeRef.current       = roomMode;
            playerRoleRef.current = 'guest';
            roomStatusRef.current = 'playing';
            setMode(roomMode);
            setRoomId(code);
            setPlayerRole('guest');
            setRoomStatus('playing');
            setShowJoinModal(false);
            setJoinCode('');

            unsubRef.current = subscribeToRoom(code, handleRoomUpdate);

            const { w, h } = calcSize(d, true);
            setSize(windowId, w, h);
        } finally {
            setJoiningRoom(false);
        }
    };

    // ── Restart Room (host only) ─────────────────────────────────────────────
    const handleRestartRoom = useCallback(async () => {
        if (!roomId || !playerRole) return;
        const { grid: newGrid } = generateGrid(difficulty);
        const initRevealed = blankRevealed(difficulty);
        const hostState = {
            revealed: JSON.stringify(initRevealed),
            flagCount: MINE_COUNTS[difficulty],
            timer: 0,
            result: 'playing' as const,
        };
        const sharedState = modeRef.current === 'coop' ? { ...hostState } : undefined;
        await restartRoom(roomId, newGrid, difficulty, hostState, sharedState);
    }, [roomId, playerRole, difficulty]);

    // ── New game — restarts the room if in one, otherwise single-player ─────
    const handleNewGame = useCallback((diff?: Difficulty) => {
        if (roomId) {
            handleRestartRoom();
        } else {
            startNewGame(diff);
        }
    }, [roomId, playerRole, handleRestartRoom, startNewGame]);

    // ── Status bar label ─────────────────────────────────────────────────────
    const statusBarLabel = (() => {
        if (!roomId) return '';
        if (mode === 'coop') {
            if (roomStatus === 'waiting') return 'Waiting for partner to join...';
            if (won)       return 'You cleared the board together!';
            if (lostCell)  return 'A mine was hit!';
            return `Co-op - ${progressPct(grid, revealed)}% cleared`;
        }
        // Versus
        if (!opponentStats) return 'Waiting for opponent...';
        if (opponentStats.result === 'won')  return 'Opponent won!';
        if (opponentStats.result === 'lost') return 'Opponent hit a mine!';
        const pct = grid.length ? `${progressPct(grid, JSON.parse(opponentStats.revealed ?? JSON.stringify(blankRevealed(difficulty))))}%` : '';
        return `Opponent - ${opponentStats.timer.toString().padStart(3, '0')}s${pct ? ` · ${pct} cleared` : ''}`;
    })();

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className={`app-content ${dseg7.variable}`}
            style={{ position: 'relative' }}
            onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
        >
            <Toolbar>
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <Button variant='menu' size='sm' onClick={() => setShowDifficultyMenu(v => !v)}>Game</Button>
                    {showDifficultyMenu && (
                        <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
                            <MenuListItem onClick={() => handleNewGame()} style={{ cursor: 'pointer' }}>New</MenuListItem>
                            <Separator />
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <MenuListItem
                                    key={d}
                                    onClick={() => { leaveRoom(); setDifficulty(d); setShowDifficultyMenu(false); }}
                                    style={{ cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ display: 'inline-block', width: '10px' }}>
                                            {difficulty === d && <img src={Icons.CHECK} width='10px' />}
                                        </span>
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </span>
                                </MenuListItem>
                            ))}
                            <Separator />
                            <MenuListItem onClick={() => openWindow('minesweeper-records')} style={{ cursor: 'pointer' }}>
                                Best Times...
                            </MenuListItem>
                            <Separator />
                            <MenuListItem
                                onClick={() => { setShowModeModal(true); setShowDifficultyMenu(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                Start Room
                            </MenuListItem>
                            <MenuListItem
                                onClick={() => { setShowJoinModal(true); setShowDifficultyMenu(false); }}
                                style={{ cursor: 'pointer' }}
                            >
                                Join Room
                            </MenuListItem>
                        </MenuList>
                    )}
                </div>
                <Button variant='menu' size='sm'>Help</Button>
            </Toolbar>

            <Frame className='minesweeper' variant='well'>
                <Frame variant='well' className='minesweeper-header-frame'>
                    <div className='minesweeper-header'>
                        <div className='flag-count'><span>{flagCount.toString().padStart(3, '0')}</span></div>
                        <Button className='face' onClick={() => handleNewGame()}>
                            <img src={lostCell === null ? SMILE : DEAD} />
                        </Button>
                        <div className='timer'><span>{timer.toString().padStart(3, '0')}</span></div>
                    </div>
                </Frame>

                {/* Multiplayer status bar */}
                {roomId && (
                    <div style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#c0c0c0',
                        borderTop: '1px solid #808080',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: `${OPPONENT_BAR_H}px`,
                        boxSizing: 'border-box',
                    }}>
                        <img
                            src={mode === 'coop' ? Icons.JOYSTICK : Icons.JOYSTICK_ALT}
                            width='14' height='14'
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <span style={{ flex: 1 }}>{statusBarLabel}</span>
                        {playerRole && (won || lostCell) && (
                            <button
                                onClick={handleRestartRoom}
                                style={{ fontSize: '9px', cursor: 'pointer', padding: '0 4px', height: '16px', background: '#c0c0c0', border: '1px solid #808080' }}
                            >
                                Restart
                            </button>
                        )}
                        <button
                            onClick={leaveRoom}
                            style={{ fontSize: '9px', cursor: 'pointer', padding: '0 4px', height: '16px', background: '#c0c0c0', border: '1px solid #808080' }}
                        >
                            Leave
                        </button>
                        <span style={{
                            padding: '1px 4px',
                            fontSize: '9px',
                            background: roomStatus === 'waiting' ? '#808000' : mode === 'coop' ? '#006080' : '#008000',
                            color: 'white',
                        }}>
                            {roomStatus === 'waiting' ? `ROOM: ${roomId}` : `${mode === 'coop' ? 'CO-OP' : 'LIVE'} · ${roomId}`}
                        </span>
                    </div>
                )}

                <ScrollView className='minesweeper-board'>
                    {grid.length > 0 && (
                        <MinesweeperGrid
                            grid={grid}
                            revealed={revealed}
                            lostCell={lostCell}
                            gameOver={lostCell !== null}
                            onCellClick={onCellClick}
                            onCellRightClick={onCellRightClick}
                        />
                    )}
                </ScrollView>
            </Frame>

            {/* ── Mode Selection Modal ─────────────────────────────────────── */}
            {showModeModal && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)', zIndex: 200,
                }}>
                    <Frame variant='outside' style={{ width: '220px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Start Room
                        </div>
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px' }}>Select game mode:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <Radio
                                    checked={mode === 'versus'}
                                    onChange={() => setMode('versus')}
                                    name='room-mode'
                                    value='versus'
                                    label='Versus - race to clear the board'
                                />
                                <Radio
                                    checked={mode === 'coop'}
                                    onChange={() => setMode('coop')}
                                    name='room-mode'
                                    value='coop'
                                    label='Co-op - clear the board together'
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '0 12px 12px' }}>
                            <Button
                                style={{ width: '72px', fontSize: '11px' }}
                                onClick={() => { setShowModeModal(false); handleStartRoom(); }}
                                disabled={startingRoom}
                            >
                                {startingRoom ? '...' : 'Create'}
                            </Button>
                            <Button
                                style={{ width: '72px', fontSize: '11px' }}
                                onClick={() => setShowModeModal(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Frame>
                </div>
            )}

            {/* ── Start Room Modal ──────────────────────────────────────────── */}
            {showStartModal && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)', zIndex: 200,
                }}>
                    <Frame variant='outside' style={{ width: '240px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Minesweeper
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px' }}>
                                Share this code with your {mode === 'coop' ? 'partner' : 'opponent'}:
                            </div>
                            <div style={{
                                textAlign: 'center', fontSize: '22px', fontWeight: 'bold',
                                letterSpacing: '4px', padding: '8px', border: '2px inset #808080',
                                background: 'white', color: '#000080',
                            }}>
                                {roomId}
                            </div>
                            <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                                Mode: {mode === 'coop' ? 'Co-op' : 'Versus'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#444', textAlign: 'center' }}>
                                {roomStatus === 'waiting'
                                    ? `Waiting for ${mode === 'coop' ? 'partner' : 'opponent'} to join...`
                                    : `${mode === 'coop' ? 'Partner' : 'Opponent'} joined!`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px 12px' }}>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={leaveRoom}>Cancel</Button>
                        </div>
                    </Frame>
                </div>
            )}

            {/* ── Join Room Modal ───────────────────────────────────────────── */}
            {showJoinModal && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)', zIndex: 200,
                }}>
                    <Frame variant='outside' style={{ width: '240px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Join Room
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px' }}>Enter the 6-character room code:</div>
                            <TextInput
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                                placeholder='e.g. AB3K9X'
                                maxLength={6}
                                fullWidth
                                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px' }}
                            />
                            {joinError && <div style={{ fontSize: '10px', color: '#c00000' }}>{joinError}</div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '0 12px 12px' }}>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={handleJoinRoom} disabled={joiningRoom}>
                                {joiningRoom ? '...' : 'Join'}
                            </Button>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}>
                                Cancel
                            </Button>
                        </div>
                    </Frame>
                </div>
            )}
        </div>
    );
}
