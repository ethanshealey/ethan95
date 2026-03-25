export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export const GRID_COLS: Record<Difficulty, number> = { beginner: 9, intermediate: 16, expert: 30 };
export const GRID_ROWS: Record<Difficulty, number> = { beginner: 9, intermediate: 16, expert: 16 };
export const MINE_COUNTS: Record<Difficulty, number> = { beginner: 10, intermediate: 40, expert: 99 };

export function generateGrid(difficulty: Difficulty): { grid: number[][], revealed: number[][] } {
    const width = GRID_COLS[difficulty];
    const height = GRID_ROWS[difficulty];
    const mineCount = MINE_COUNTS[difficulty];

    const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));
    const revealed: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

    let placed = 0;
    while (placed < mineCount) {
        const r = Math.floor(Math.random() * height);
        const c = Math.floor(Math.random() * width);
        if (grid[r][c] !== -1) {
            grid[r][c] = -1;
            placed++;
        }
    }

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (grid[r][c] === -1) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === -1) count++;
                }
            }
            grid[r][c] = count;
        }
    }

    return { grid, revealed };
}

export function checkWin(grid: number[][], revealed: number[][]): boolean {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] !== -1 && revealed[r][c] !== 1) return false;
        }
    }
    return true;
}

export function floodReveal(x: number, y: number, grid: number[][], revealed: number[][]): number[][] {
    const newRevealed = revealed.map(row => row.slice());

    const reveal = (rx: number, ry: number) => {
        if (newRevealed[ry][rx] !== 0) return;
        newRevealed[ry][rx] = 1;
        if (grid[ry][rx] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = ry + dr, nc = rx + dc;
                    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
                        reveal(nc, nr);
                    }
                }
            }
        }
    };

    reveal(x, y);
    return newRevealed;
}
