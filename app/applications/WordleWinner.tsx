'use client';

import ScoreSubmitDialog from '../components/ScoreSubmitDialog';

interface WordleWinnerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  won?: boolean;
  guesses?: number;
  hardMode?: boolean;
}

export default function WordleWinner({ windowId, focusWindow, won, guesses, hardMode }: WordleWinnerProps) {
  const plural = guesses === 1 ? 'guess' : 'guesses';

  return (
    <ScoreSubmitDialog
      windowId={windowId}
      focusWindow={focusWindow}
      game="wordle"
      title="You got it!"
      message={<>Solved in {guesses} {plural}! Enter your name to save your score.</>}
      valid={!!won && typeof guesses === 'number'}
      extraFields={{ guesses, hardMode }}
      autoFocusInput
    />
  );
}
