import { Difficulty, GRID_ROWS, GRID_COLS, MINE_COUNTS } from './MinesweeperUtils';
import type { RoomMode, RoomPlayerResult, RoomPlayerState } from '../../../../lib/minesweeperRoom';

export type OpponentStats = {
    timer: number;
    flagCount: number;
    result: string;
    revealed: string;
};

/** 2-D array of zeros matching the given difficulty's grid dimensions. */
export function blankRevealed(difficulty: Difficulty): number[][] {
    return Array.from({ length: GRID_ROWS[difficulty] }, () =>
        Array(GRID_COLS[difficulty]).fill(0)
    );
}

/** Percentage of non-mine cells that have been revealed (0–100, rounded). */
export function progressPct(grid: number[][], revealed: number[][]): number {
    let total = 0, done = 0;
    for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[r].length; c++)
            if (grid[r][c] !== -1) { total++; if (revealed[r][c] === 1) done++; }
    return total === 0 ? 0 : Math.round((done / total) * 100);
}

/** Builds a RoomPlayerState snapshot from the current board state. */
export function buildPlayerState(
    revealed: number[][],
    flagCount: number,
    timer: number,
    result: RoomPlayerResult = 'playing',
): RoomPlayerState {
    return { revealed: JSON.stringify(revealed), flagCount, timer, result };
}

/** Derives the multiplayer status bar text from current room + game state. */
export function buildStatusBarLabel(
    roomId: string | null,
    mode: RoomMode,
    roomStatus: 'waiting' | 'playing' | null,
    won: boolean,
    lostCell: { x: number; y: number } | null,
    grid: number[][],
    revealed: number[][],
    opponentStats: OpponentStats | null,
    difficulty: Difficulty,
): string {
    if (!roomId) return '';

    if (mode === 'coop') {
        if (roomStatus === 'waiting') return 'Waiting for partner to join...';
        if (won)      return 'You cleared the board together!';
        if (lostCell) return 'A mine was hit!';
        return `Co-op - ${progressPct(grid, revealed)}% cleared`;
    }

    // Versus
    if (!opponentStats) return 'Waiting for opponent...';
    if (opponentStats.result === 'won')  return 'Opponent won!';
    if (opponentStats.result === 'lost') return 'Opponent hit a mine!';
    const opRevealed: number[][] = JSON.parse(
        opponentStats.revealed ?? JSON.stringify(blankRevealed(difficulty))
    );
    const pct = grid.length ? `${progressPct(grid, opRevealed)}%` : '';
    return `Opponent - ${opponentStats.timer.toString().padStart(3, '0')}s${pct ? ` · ${pct} cleared` : ''}`;
}
