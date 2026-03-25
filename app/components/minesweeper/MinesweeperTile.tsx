import React from 'react'
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

const MinesweeperTile = (props: MinesweeperTileProps) => {

    const TILE_MINE = '/static/images/minesweeper/tile-mine.png';
    const TILE_MINE_WRONG = '/static/images/minesweeper/tile-mine-wrong.png';
    const TILE_NEAR = `/static/images/minesweeper/minesweeper-tile-${props.adjacentMines}.png`
    const TILE_FLAG = '/static/images/minesweeper/tile-flag.png';

    const onTileRightClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        props.onRightClick(props.x, props.y);
    }

    return (
        <Button
            variant={(props.isRevealed || props.gameOver)? 'flat' : 'default'}
            className='minsweeper-tile'
            style={props.isLostCell ? { background: 'red' } : undefined}
            id={`${props.x}-${props.y}`}
            onClick={() => props.onClick(props.x, props.y)}
            onContextMenu={onTileRightClick}
        >
            {
                props.isRevealed ?
                    props.isMine ? <img src={TILE_MINE} /> :
                    props.adjacentMines > 0 ? <img src={TILE_NEAR} /> : ''
                : props.isFlagged
                    ? (props.gameOver && !props.isMine ? <img src={TILE_MINE_WRONG} /> : <img src={TILE_FLAG} />)
                    : ''
            }
            {/* {props.isRevealed
                ? (props.isMine ? '💣' : props.adjacentMines > 0 ? props.adjacentMines : '')
                : props.isFlagged ? '🚩' : ''} */}
        </Button>
    )
}

export default MinesweeperTile
