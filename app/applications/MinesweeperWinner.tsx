'use client';

import ScoreSubmitDialog from '../components/ScoreSubmitDialog';

interface MinesweeperWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  time?: number;
  difficulty?: string;
}

export default function MinesweeperWinner({ windowId, focusWindow, time, difficulty }: MinesweeperWinnerProps) {
  return (
    <ScoreSubmitDialog
      windowId={windowId}
      focusWindow={focusWindow}
      game="minesweeper"
      title="Congratulations, You won!"
      message={<>You beat {difficulty?.charAt(0).toUpperCase()}{difficulty?.slice(1)} in {time} seconds!</>}
      valid={!!time && !!difficulty?.trim()}
      extraFields={{ time, difficulty }}
      minWidth={320}
    />
  );
}
