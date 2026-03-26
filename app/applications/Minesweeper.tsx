'use client';

import { useEffect, useRef, useState } from 'react';
import localFont from 'next/font/local';
import { Button, Frame, MenuList, MenuListItem, ScrollView, Separator, Toolbar } from 'react95';
import { Icons } from '../icons/icons';
import MinesweeperGrid, { CELL_SIZE } from '../components/minesweeper/MinesweeperGrid';
import { useWindowManager } from '../hooks/useWindowManager';
import { Difficulty, GRID_COLS, GRID_ROWS, MINE_COUNTS, generateGrid, floodReveal, checkWin } from '../components/minesweeper/utils/MinesweeperUtils';

const dseg7 = localFont({
    src: [
        { path: '../fonts/DSEG7Classic-Regular.woff2', weight: '400' },
        { path: '../fonts/DSEG7Classic-Bold.woff2', weight: '700' },
    ],
    variable: '--font-dseg7',
});

const SMILE = '/static/images/minesweeper/smile.png';
const COOL = '/static/images/minesweeper/cool.png';
const STRESS = '/static/images/minesweeper/stress.png';
const DEAD = '/static/images/minesweeper/dead.png';

interface MinesweeperProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

const CHROME_W = 26;
const CHROME_H = 155;

export default function Minesweeper({ windowId, focusWindow }: MinesweeperProps) {

    const { openWindow, unfocusAll } = useWindowManager()
    
    const { setSize } = useWindowManager();

    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
    const [grid, setGrid] = useState<number[][]>([]);
    const [revealed, setRevealed] = useState<number[][]>([]);
    const [flagCount, setFlagCount] = useState<number>(0);
    const [timer, setTimer] = useState<number>(0);
    const [lostCell, setLostCell] = useState<{ x: number, y: number } | null>(null);
    const [won, setWon] = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showDifficultyMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setShowDifficultyMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDifficultyMenu]);

    useEffect(() => {
        const w = GRID_COLS[difficulty] * CELL_SIZE + CHROME_W;
        const h = GRID_ROWS[difficulty] * CELL_SIZE + CHROME_H;
        setSize(windowId, w, h);
        startNewGame();
    }, [difficulty]);

    useEffect(() => {
        if (!gameStarted || lostCell || won) return;
        timerRef.current = setInterval(() => setTimer(t => Math.min(t + 1, 999)), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameStarted, lostCell, won]);

    const startNewGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const width = GRID_COLS[difficulty];
        const height = GRID_ROWS[difficulty];
        setGrid(Array.from({ length: height }, () => Array(width).fill(0)));
        setRevealed(Array.from({ length: height }, () => Array(width).fill(0)));
        setFlagCount(MINE_COUNTS[difficulty]);
        setTimer(0);
        setLostCell(null);
        setWon(false);
        setGameStarted(false);
        setShowDifficultyMenu(false);
    };

    const onCellClick = async (x: number, y: number) => {
        if (!grid.length || revealed[y][x] !== 0 || lostCell || won) return;

        let currentGrid = grid;
        if (!gameStarted) {
            const { grid: newGrid } = generateGrid(difficulty, { r: y, c: x });
            setGrid(newGrid);
            currentGrid = newGrid;
            setGameStarted(true);
        }

        if (currentGrid[y][x] === -1) {
            setRevealed(prev => currentGrid.map((row, r) => row.map((_, c) => prev[r][c] === 2 ? 2 : 1)));
            setLostCell({ x, y });
            return;
        }

        const newRevealed = floodReveal(x, y, currentGrid, revealed);
        setRevealed(newRevealed);
        if (checkWin(currentGrid, newRevealed)) {
            setWon(true);
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

    const onCellRightClick = (x: number, y: number) => {
        if (!grid.length) return;

        if (revealed[y][x] === 0) {
            if(flagCount === 0) return;
            setRevealed(prev => prev.map((row, r) => row.map((cell, c) => r === y && c === x ? 2 : cell)));
            setFlagCount(fc => fc - 1);
        } else if (revealed[y][x] === 2) {
            setRevealed(prev => prev.map((row, r) => row.map((cell, c) => r === y && c === x ? 0 : cell)));
            setFlagCount(fc => fc + 1);
        }
    };

    return (
        <div className={`app-content ${dseg7.variable}`} onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <Toolbar>
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <Button variant='menu' size='sm' onClick={() => setShowDifficultyMenu(v => !v)}>Game</Button>
                    {showDifficultyMenu && (
                        <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
                            <MenuListItem onClick={startNewGame} style={{ cursor: 'pointer' }}>New</MenuListItem>
                            <Separator />
                            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map(d => (
                                <MenuListItem
                                    key={d}
                                    onClick={() => { setDifficulty(d); setShowDifficultyMenu(false); }}
                                    style={{ cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ display: 'inline-block', width: '10px' }}>
                                            {difficulty === d && <img src={Icons.CHECK} width={'10px'} />}
                                        </span>
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </span>
                                </MenuListItem>
                            ))}
                            <Separator />
                            <MenuListItem onClick={() => openWindow('minesweeper-records')} style={{ cursor: 'pointer' }}>
                                Best Times...
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
                        <Button className='face' onClick={startNewGame}><img src={lostCell === null ? SMILE : DEAD} /></Button>
                        <div className='timer'><span>{timer.toString().padStart(3, '0')}</span></div>
                    </div>
                </Frame>
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
        </div>
    );
}
