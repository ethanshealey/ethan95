'use client';

import React, { useEffect, useState } from 'react';
import { Button, Frame, Toolbar } from 'react95';

interface SudokuLeaderboardProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type Score = {
  username: string;
  wins: number;
};

export default function SudokuLeaderboard({ windowId, focusWindow }: SudokuLeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId);
    getScores();
  }, []);

  const getScores = async () => {
    const res = await fetch('/api/sudoku');
    const json = await res.json();
    setScores(json);
  };

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Toolbar>
        <Button variant='menu' size='sm' onClick={getScores}>Refresh</Button>
      </Toolbar>
      <Frame style={{ padding: '0 20px' }} variant='well'>
        <div style={{ marginBottom: '16px' }}>
          <h2>Sudoku Leaderboard</h2>
          <Frame variant='field' style={{ padding: '10px 20px', width: '100%', maxHeight: '300px', overflowY: 'auto' }}>
            {scores.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '60px' }}>Rank</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Name</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '60px' }}>Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <tr key={index}>
                      <td style={{ padding: '2px 0' }}>#{index + 1}</td>
                      <td style={{ padding: '2px 0', minWidth: '125px' }}>{score.username}</td>
                      <td style={{ padding: '2px 0' }}>{score.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No scores yet</p>
            )}
          </Frame>
        </div>
      </Frame>
    </div>
  );
}
