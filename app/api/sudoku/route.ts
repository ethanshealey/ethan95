import { adminDb } from '@/lib/firebase-admin';

interface Score {
  username: string;
  difficulty: string;
  wins: number;
  bestTime: number;
  lastWin: number;
}

export async function GET() {
  const snapshot = await adminDb.collection('sudoku').orderBy('wins', 'desc').get();
  const scores: Score[] = snapshot.docs.map((doc) => {
    const d = doc.data() as Score;
    return { username: d.username, difficulty: d.difficulty, wins: d.wins, bestTime: d.bestTime, lastWin: d.lastWin };
  });
  return Response.json(scores);
}
