'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import localFont from 'next/font/local';
import { Button, Frame, MenuList, MenuListItem, Radio, Separator, TextInput, Toolbar } from 'react95';
import { Icons } from '../icons/icons';
import MinesweeperGrid, { CELL_SIZE } from '../components/minesweeper/MinesweeperGrid';
import { useWindowManager } from '../hooks/useWindowManager';
import { useIsMobile } from '../hooks/useIsMobile';
import { Difficulty, GRID_COLS, GRID_ROWS, MINE_COUNTS, generateGrid, floodReveal, checkWin } from '../components/minesweeper/utils/MinesweeperUtils';
import { useMinesweeperRoom, GameSetters } from '../components/minesweeper/hooks/useMinesweeperRoom';
import { blankRevealed, buildStatusBarLabel } from '../components/minesweeper/utils/MinesweeperMultiplayerUtils';

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

export default function Minesweeper({ windowId, focusWindow }: MinesweeperProps) {

    const { openWindow, setSize } = useWindowManager();
    const isMobile = useIsMobile();

    const [difficulty, setDifficulty]   = useState<Difficulty>('beginner');
    const [showDiffMenu, setShowDiffMenu] = useState(false);
    const [grid, setGrid]               = useState<number[][]>([]);
    const [revealed, setRevealed]       = useState<number[][]>([]);
    const [flagCount, setFlagCount]     = useState<number>(0);
    const [timer, setTimer]             = useState<number>(0);
    const [lostCell, setLostCell]       = useState<{ x: number; y: number } | null>(null);
    const [won, setWon]                 = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [boardScale, setBoardScale]   = useState<number>(1);

    const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
    const menuRef           = useRef<HTMLDivElement>(null);
    const boardContainerRef = useRef<HTMLDivElement>(null);

    // Stable bundle — React dispatchers are referentially stable so the empty deps array is safe.
    const gameSetters: GameSetters = useMemo(() => ({
        setGrid, setRevealed, setFlagCount, setTimer,
        setLostCell, setWon, setGameStarted, setDifficulty,
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    const room = useMinesweeperRoom(
        difficulty,
        timer,
        gameSetters,
        (d: Difficulty) => {
            const { w, h } = calcSize(d, true);
            setSize(windowId, w, h);
        },
    );

    /** Leaves any active room and resets all game state to start a fresh single-player game. */
    const startNewGame = useCallback((diff?: Difficulty) => {
        if (timerRef.current) clearInterval(timerRef.current);
        room.leaveRoom();
        const d = diff ?? difficulty;
        setGrid(Array.from({ length: GRID_ROWS[d] }, () => Array(GRID_COLS[d]).fill(0)));
        setRevealed(blankRevealed(d));
        setFlagCount(MINE_COUNTS[d]);
        setTimer(0);
        setLostCell(null);
        setWon(false);
        setGameStarted(false);
        setShowDiffMenu(false);
    }, [difficulty, room.leaveRoom]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNewGame = useCallback((diff?: Difficulty) => {
        if (room.roomId) room.restartRoom();
        else             startNewGame(diff);
    }, [room.roomId, room.restartRoom, startNewGame]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resize the window and reset the board when difficulty changes (single-player only).
    useEffect(() => {
        if (room.roomId) return;
        const { w, h } = calcSize(difficulty, false);
        setSize(windowId, w, h);
        startNewGame(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [difficulty]);

    // Scale the board to fit the available viewport on mobile.
    useEffect(() => {
        if (!isMobile) { setBoardScale(1); return; }
        if (!boardContainerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width }  = entries[0].contentRect;
            const availableH = window.innerHeight - CHROME_H - 50 - (room.roomId ? OPPONENT_BAR_H : 0);
            const scaleW = width      / (GRID_COLS[difficulty] * CELL_SIZE);
            const scaleH = availableH / (GRID_ROWS[difficulty] * CELL_SIZE);
            setBoardScale(Math.min(scaleW, scaleH));
        });
        obs.observe(boardContainerRef.current);
        return () => obs.disconnect();
    }, [isMobile, difficulty, room.roomId]);

    // Advance the timer every second while the game is in progress.
    useEffect(() => {
        if (!gameStarted || lostCell || won) return;
        timerRef.current = setInterval(() => setTimer(t => Math.min(t + 1, 999)), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameStarted, lostCell, won]);

    // Dismiss the difficulty menu when the user clicks outside of it.
    useEffect(() => {
        if (!showDiffMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setShowDiffMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDiffMenu]);

    /** Handles a left click: generates the grid on first click, reveals the cell, and checks for mine hit or win. */
    const onCellClick = async (x: number, y: number) => {
        if (!grid.length || revealed[y][x] !== 0 || lostCell || won) return;

        let currentGrid = grid;
        if (!gameStarted) {
            if (!room.roomId) {
                const { grid: newGrid } = generateGrid(difficulty, { r: y, c: x });
                setGrid(newGrid);
                currentGrid = newGrid;
            }
            setGameStarted(true);
        }

        if (currentGrid[y][x] === -1) {
            const newRevealed = currentGrid.map((row, r) => row.map((_, c) => revealed[r][c] === 2 ? 2 : 1));
            setRevealed(newRevealed);
            setLostCell({ x, y });
            if (room.isMultiplayer) await room.syncLoss(newRevealed, flagCount, timer, { x, y });
            return;
        }

        const newRevealed = floodReveal(x, y, currentGrid, revealed);
        setRevealed(newRevealed);
        if (room.isMultiplayer) await room.syncReveal(newRevealed, flagCount, timer);

        if (checkWin(currentGrid, newRevealed)) {
            setWon(true);
            if (room.isMultiplayer) {
                await room.syncWin(newRevealed, flagCount, timer);
                return;
            }
            openWindow('minesweeper-winner', { props: { time: timer, difficulty } });
        }
    };

    /** Toggles a flag on an unrevealed cell, or removes an existing flag. */
    const onCellRightClick = async (x: number, y: number) => {
        if (!grid.length) return;
        let newRevealed = revealed;
        let newFlagCount = flagCount;

        if (revealed[y][x] === 0) {
            if (flagCount === 0) return;
            newRevealed  = revealed.map((row, r) => row.map((cell, c) => r === y && c === x ? 2 : cell));
            newFlagCount = flagCount - 1;
        } else if (revealed[y][x] === 2) {
            newRevealed  = revealed.map((row, r) => row.map((cell, c) => r === y && c === x ? 0 : cell));
            newFlagCount = flagCount + 1;
        } else {
            return;
        }

        setRevealed(newRevealed);
        setFlagCount(newFlagCount);
        if (room.isMultiplayer) await room.syncFlag(newRevealed, newFlagCount, timer);
    };

    const statusBarLabel = buildStatusBarLabel(
        room.roomId, room.mode, room.roomStatus,
        won, lostCell, grid, revealed, room.opponentStats, difficulty,
    );

    return (
        <div
            className={`app-content ${dseg7.variable}`}
            style={{ position: 'relative' }}
            onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}
        >
            <Toolbar>
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <Button variant='menu' size='sm' onClick={() => setShowDiffMenu(v => !v)}>Game</Button>
                    {showDiffMenu && (
                        <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
                            <MenuListItem onClick={() => handleNewGame()} style={{ cursor: 'pointer' }}>New</MenuListItem>
                            <Separator />
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <MenuListItem
                                    key={d}
                                    onClick={() => { room.leaveRoom(); setDifficulty(d); setShowDiffMenu(false); }}
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
                            <MenuListItem onClick={() => { room.setShowModeModal(true); setShowDiffMenu(false); }} style={{ cursor: 'pointer' }}>
                                Start Room
                            </MenuListItem>
                            <MenuListItem onClick={() => { room.setShowJoinModal(true); setShowDiffMenu(false); }} style={{ cursor: 'pointer' }}>
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
                {room.roomId && (
                    <div style={{
                        fontSize: '10px', padding: '2px 6px', background: '#c0c0c0',
                        borderTop: '1px solid #808080', display: 'flex', alignItems: 'center',
                        gap: '6px', height: `${OPPONENT_BAR_H}px`, boxSizing: 'border-box',
                    }}>
                        <img
                            src={room.isCoop ? Icons.JOYSTICK : Icons.JOYSTICK_ALT}
                            width='14' height='14'
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <span style={{ flex: 1 }}>{statusBarLabel}</span>
                        {room.playerRole && (won || lostCell) && (
                            <button
                                onClick={room.restartRoom}
                                style={{ fontSize: '9px', cursor: 'pointer', padding: '0 4px', height: '16px', background: '#c0c0c0', border: '1px solid #808080' }}
                            >
                                Restart
                            </button>
                        )}
                        <button
                            onClick={room.leaveRoom}
                            style={{ fontSize: '9px', cursor: 'pointer', padding: '0 4px', height: '16px', background: '#c0c0c0', border: '1px solid #808080' }}
                        >
                            Leave
                        </button>
                        <span style={{
                            padding: '1px 4px', fontSize: '9px',
                            background: room.roomStatus === 'waiting' ? '#808000' : room.isCoop ? '#006080' : '#008000',
                            color: 'white',
                        }}>
                            {room.roomStatus === 'waiting'
                                ? `ROOM: ${room.roomId}`
                                : `${room.isCoop ? 'CO-OP' : 'LIVE'} · ${room.roomId}`}
                        </span>
                    </div>
                )}

                <div
                    ref={boardContainerRef}
                    className='minesweeper-board'
                    style={{ '--cell-size': `${CELL_SIZE * boardScale}px` } as React.CSSProperties}
                >
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
                </div>
            </Frame>

            {/* Mode Selection Modal */}
            {room.showModeModal && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 200 }}>
                    <Frame variant='outside' style={{ width: '220px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Start Room
                        </div>
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px' }}>Select game mode:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <Radio checked={room.mode === 'versus'} onChange={() => room.setMode('versus')} name='room-mode' value='versus' label='Versus - race to clear the board' />
                                <Radio checked={room.mode === 'coop'}   onChange={() => room.setMode('coop')}   name='room-mode' value='coop'   label='Co-op - clear the board together' />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '0 12px 12px' }}>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={() => { room.setShowModeModal(false); room.startRoom(); }} disabled={room.startingRoom}>
                                {room.startingRoom ? '...' : 'Create'}
                            </Button>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={() => room.setShowModeModal(false)}>
                                Cancel
                            </Button>
                        </div>
                    </Frame>
                </div>
            )}

            {/* Start Room Modal */}
            {room.showStartModal && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 200 }}>
                    <Frame variant='outside' style={{ width: '240px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Minesweeper
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px' }}>
                                Share this code with your {room.isCoop ? 'partner' : 'opponent'}:
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', letterSpacing: '4px', padding: '8px', border: '2px inset #808080', background: 'white', color: '#000080' }}>
                                {room.roomId}
                            </div>
                            <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                                Mode: {room.isCoop ? 'Co-op' : 'Versus'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#444', textAlign: 'center' }}>
                                {room.roomStatus === 'waiting'
                                    ? `Waiting for ${room.isCoop ? 'partner' : 'opponent'} to join...`
                                    : `${room.isCoop ? 'Partner' : 'Opponent'} joined!`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px 12px' }}>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={room.leaveRoom}>Cancel</Button>
                        </div>
                    </Frame>
                </div>
            )}

            {/* Join Room Modal */}
            {room.showJoinModal && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 200 }}>
                    <Frame variant='outside' style={{ width: '240px', padding: 0 }}>
                        <div style={{ background: '#000080', color: 'white', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                            Join Room
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px' }}>Enter the 6-character room code:</div>
                            <TextInput
                                value={room.joinCode}
                                onChange={(e) => room.setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && room.joinRoom()}
                                placeholder='e.g. AB3K9X'
                                maxLength={6}
                                fullWidth
                                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px' }}
                            />
                            {room.joinError && <div style={{ fontSize: '10px', color: '#c00000' }}>{room.joinError}</div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '0 12px 12px' }}>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={room.joinRoom} disabled={room.joiningRoom}>
                                {room.joiningRoom ? '...' : 'Join'}
                            </Button>
                            <Button style={{ width: '72px', fontSize: '11px' }} onClick={() => { room.setShowJoinModal(false); room.setJoinCode(''); }}>
                                Cancel
                            </Button>
                        </div>
                    </Frame>
                </div>
            )}
        </div>
    );
}
