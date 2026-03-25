'use client';

import React, { useEffect, useState } from 'react';
import { Frame } from 'react95';

interface MinesweeperRecordsProps {
  windowId: string;
  focusWindow: (id: string) => void;
  defaultContent?: string;
}

type Score = {
  username: string;
  time: number;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  createdAt: string;
}

type Scores = {
  beginner: Score[],
  intermediate: Score[],
  expert: Score[],
}

export default function MinesweeperRecords({ windowId, focusWindow, defaultContent }: MinesweeperRecordsProps) {
  const [ scores, setScores ] = useState<Scores>();

  useEffect(() => {
    document.getElementById(windowId)?.focus();
    focusWindow(windowId)

    getScores()
  }, [])

  const getScores = async () => {
    const data = await fetch('/api/minesweeper');
    const json = await data.json();

    const sort = (arr: Score[]) => [...arr].sort((a, b) => a.time - b.time);
    setScores({ beginner: sort(json.beginner), intermediate: sort(json.intermediate), expert: sort(json.expert) });
    console.log(json)
  }

  const renderSection = (label: string, list: Score[] | undefined) => (
    <div key={label} style={{ marginBottom: '16px' }}>
      <h2>{label}</h2>
      <Frame variant='field' style={{ padding: '10px 20px', width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
      {list?.length ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '6px', width: '60px' }}>Rank</th>
              <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Name</th>
              <th style={{ textAlign: 'left', paddingBottom: '6px', width: '80px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {list.map((score, index) => (
              <tr key={index}>
                <td style={{ padding: '2px 0' }}>#{index + 1}</td>
                <td style={{ padding: '2px 0', minWidth: '125px' }}>{score.username}</td>
                <td style={{ padding: '2px 0' }}>{score.time}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>No scores yet</p>}
      </Frame>
    </div>
  );

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Frame style={{ padding: '0 20px' }} variant='well'>
        {renderSection('Beginner', scores?.beginner)}
        {renderSection('Intermediate', scores?.intermediate)}
        {renderSection('Expert', scores?.expert)}
      </Frame>
    </div>
  );
}
