'use client';

import ScoreSubmitDialog from '../components/ScoreSubmitDialog';

interface FreeCellWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
}

export default function FreeCellWinner({ windowId, focusWindow, won }: FreeCellWinnerProps) {
  return (
    <ScoreSubmitDialog
      windowId={windowId}
      focusWindow={focusWindow}
      game="freecell"
      title="Congratulations, You won!"
      message="Enter your name to save your score to the leaderboard."
      valid={!!won}
    />
  );
}
