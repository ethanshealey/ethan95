'use client';

import ScoreSubmitDialog from '../components/ScoreSubmitDialog';

interface SudokuWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
  difficulty?: string;
  time?: number;
}

export default function SudokuWinner({ windowId, focusWindow, won, difficulty, time }: SudokuWinnerProps) {
  return (
    <ScoreSubmitDialog
      windowId={windowId}
      focusWindow={focusWindow}
      game="sudoku"
      title="Congratulations, You solved it!"
      message={<>You solved {difficulty?.charAt(0).toUpperCase()}{difficulty?.slice(1)} in {time}s! Enter your name to save your win to the leaderboard.</>}
      valid={!!won && !!difficulty?.trim()}
      extraFields={{ difficulty, time }}
    />
  );
}
