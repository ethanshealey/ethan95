'use client';

import ScoreSubmitDialog from '../components/ScoreSubmitDialog';

interface SolitaireWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
}

export default function SolitaireWinner({ windowId, focusWindow, won }: SolitaireWinnerProps) {
  return (
    <ScoreSubmitDialog
      windowId={windowId}
      focusWindow={focusWindow}
      game="solitaire"
      title="Congratulations, You won!"
      message="Enter your name to save your score to the leaderboard."
      valid={!!won}
    />
  );
}
