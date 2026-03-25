import MinesweeperTile from './MinesweeperTile';

export const CELL_SIZE = 30;

type MinesweeperGridProps = {
    grid: number[][];
    revealed: number[][];
    lostCell: { x: number, y: number } | null;
    gameOver: boolean;
    onCellClick: (x: number, y: number) => void;
    onCellRightClick: (x: number, y: number) => void;
}

const MinesweeperGrid = ({ grid, revealed, lostCell, gameOver, onCellClick, onCellRightClick }: MinesweeperGridProps) => {
    return (
        <div>
            {grid.map((row, r) => (
                <div key={r} style={{ display: 'flex' }}>
                    {row.map((cell, c) => (
                        <MinesweeperTile
                            key={c}
                            isRevealed={revealed[r][c] === 1}
                            isFlagged={revealed[r][c] === 2}
                            isMine={cell === -1}
                            isLostCell={lostCell?.x === c && lostCell?.y === r}
                            gameOver={gameOver}
                            adjacentMines={cell > 0 ? cell : 0}
                            onClick={() => onCellClick(c, r)}
                            onRightClick={() => onCellRightClick(c, r)}
                            x={r}
                            y={c}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default MinesweeperGrid;
