import React, { useRef } from 'react'
import { Button } from 'react95';

type MinesweeperTileProps = {
    x: number;
    y: number;
    isRevealed: boolean;
    isFlagged: boolean;
    isMine: boolean;
    isLostCell?: boolean;
    gameOver?: boolean;
    adjacentMines: number;
    onClick: (x: number, y: number) => void;
    onRightClick: (x: number, y: number) => void;
}

const LONG_PRESS_MS = 450;

const MinesweeperTile = (props: MinesweeperTileProps) => {

    const TILE_MINE       = '/static/images/minesweeper/tile-mine.png';
    const TILE_MINE_WRONG = '/static/images/minesweeper/tile-mine-wrong.png';
    const TILE_NEAR       = `/static/images/minesweeper/minesweeper-tile-${props.adjacentMines}.png`;
    const TILE_FLAG       = '/static/images/minesweeper/tile-flag.png';

    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress   = useRef(false);

    const onTouchStart = () => {
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            navigator.vibrate?.(30);
            props.onRightClick(props.x, props.y);
        }, LONG_PRESS_MS);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (didLongPress.current) {
            didLongPress.current = false;
            return;
        }
        props.onClick(props.x, props.y);
    };

    const onTileRightClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        props.onRightClick(props.x, props.y);
    };

    return (
        <Button
            variant={(props.isRevealed || props.gameOver) ? 'flat' : 'default'}
            className='minsweeper-tile'
            style={props.isLostCell ? { background: 'red' } : undefined}
            id={`${props.x}-${props.y}`}
            onClick={handleClick}
            onContextMenu={onTileRightClick}
            onTouchStart={onTouchStart}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
        >
            {
                props.isRevealed ?
                    props.isMine ? <img src={TILE_MINE} /> :
                    props.adjacentMines > 0 ? <img src={TILE_NEAR} /> : ''
                : props.isFlagged
                    ? (props.gameOver && !props.isMine ? <img src={TILE_MINE_WRONG} /> : <img src={TILE_FLAG} />)
                    : ''
            }
        </Button>
    )
}

export default MinesweeperTile
