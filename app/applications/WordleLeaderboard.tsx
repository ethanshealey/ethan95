'use client';

import React, { useEffect, useState } from 'react';
import { Button, Frame, Tab, TabBody, Tabs, Toolbar } from 'react95';

interface WordleLeaderboardProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

interface Score {
  username: string;
  wins: number;
  bestGuesses: number;
  lastWin: number;
  isHardMode: boolean;
  isBot: boolean;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WordleLeaderboard({ windowId, focusWindow }: WordleLeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId);
    getScores();
  }, []);

  const getScores = async () => {
    const res = await fetch('/api/wordle');
    const json = await res.json();
    setScores(json);
  };

  const sortScores = (list: Score[]) => [...list].sort((a, b) => b.wins - a.wins || a.bestGuesses - b.bestGuesses);

  const players = sortScores(scores.filter((score) => !score.isBot && !score.isHardMode));
  const hardMode = sortScores(scores.filter((score) => !score.isBot && score.isHardMode));
  const bots = sortScores(scores.filter((score) => score.isBot));

  const renderTable = (list: Score[]) => (
    <Frame variant='field' style={{ padding: '10px 20px', width: '100%', maxHeight: 300, overflowY: 'auto' }}>
      {list.length ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: 6, width: 40 }}>Rank</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Name</th>
              <th style={{ textAlign: 'left', paddingBottom: 6, width: 50 }}>Wins</th>
              <th style={{ textAlign: 'left', paddingBottom: 6, width: 50 }}>Best</th>
              <th style={{ textAlign: 'left', paddingBottom: 6, width: 100 }}>Last Win</th>
            </tr>
          </thead>
          <tbody>
            {list.map((score, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 0' }}>#{i + 1}</td>
                <td style={{ padding: '2px 0', minWidth: 100 }}>{score.username}</td>
                <td style={{ padding: '2px 0' }}>{score.wins}</td>
                <td style={{ padding: '2px 0' }}>{score.bestGuesses}</td>
                <td style={{ padding: '2px 0' }}>{formatDate(score.lastWin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No scores yet. Be the first!</p>
      )}
    </Frame>
  );

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Toolbar>
        <Button variant='menu' size='sm' onClick={getScores}>Refresh</Button>
      </Toolbar>
      <Frame style={{ padding: '0 20px' }} variant='well'>
        <div style={{ marginBottom: 16 }}>
          <h2>Wordle Leaderboard</h2>
          <Tabs value={activeTab} onChange={(e) => setActiveTab(e)} style={{ width: '100%' }}>
            <Tab value={0}>Players</Tab>
            <Tab value={1}>Hard Mode</Tab>
            <Tab value={2}>Bots</Tab>
          </Tabs>
          <TabBody>
            {activeTab === 0 ? renderTable(players) : activeTab === 1 ? renderTable(hardMode) : renderTable(bots)}
          </TabBody>
        </div>
      </Frame>
    </div>
  );
}
