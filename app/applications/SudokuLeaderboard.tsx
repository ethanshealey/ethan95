'use client';

import React, { useEffect, useState } from 'react';
import { Button, Frame, Toolbar } from 'react95';

interface SudokuLeaderboardProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type Score = {
  username: string;
  difficulty: string;
  wins: number;
  bestTime: number;
  lastWin: number;
};

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SudokuLeaderboard({ windowId, focusWindow }: SudokuLeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [tab, setTab] = useState<Difficulty>('easy');

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

  const filtered = scores
    .filter((s) => s.difficulty === tab)
    .sort((a, b) => b.wins - a.wins);

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Toolbar>
        <Button variant='menu' size='sm' onClick={getScores}>Refresh</Button>
      </Toolbar>
      <Frame style={{ padding: '0 20px' }} variant='well'>
        <div style={{ marginBottom: '16px' }}>
          <h2>Sudoku Leaderboard</h2>

          {/* Difficulty tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {DIFFICULTIES.map((d) => (
              <Button
                key={d}
                size='sm'
                variant={tab === d ? 'default' : 'menu'}
                onClick={() => setTab(d)}
                style={{ textTransform: 'capitalize' }}
              >
                {d}
              </Button>
            ))}
          </div>

          <Frame variant='field' style={{ padding: '10px 20px', width: '100%', maxHeight: '300px', overflowY: 'auto' }}>
            {filtered.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '40px' }}>Rank</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Name</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '50px' }}>Wins</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '70px' }}>Best Time</th>
                    <th style={{ textAlign: 'left', paddingBottom: '6px', width: '100px' }}>Last Win</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((score, index) => (
                    <tr key={index}>
                      <td style={{ padding: '2px 0' }}>#{index + 1}</td>
                      <td style={{ padding: '2px 0', minWidth: '100px' }}>{score.username}</td>
                      <td style={{ padding: '2px 0' }}>{score.wins}</td>
                      <td style={{ padding: '2px 0' }}>{formatTime(score.bestTime)}</td>
                      <td style={{ padding: '2px 0' }}>{formatDate(score.lastWin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No scores yet for {tab}</p>
            )}
          </Frame>
        </div>
      </Frame>
    </div>
  );
}
