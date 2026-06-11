import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface Score {
  username: string;
  time: string;
  difficulty: string;
  createdAt: Timestamp;
}

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;

export async function GET() {
  const snapshot = await adminDb.collection('minesweeper').orderBy('time', 'asc').get();
  const allScores: Score[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Score;
    return {
      username: data.username,
      time: data.time,
      difficulty: data.difficulty,
      createdAt: data.createdAt,
    };
  });

  const uniqueScores = new Map<string, Score>();
  for (const score of allScores) {
    const key = `${score.username}:${score.difficulty}`;
    if (!uniqueScores.has(key) || score.time < uniqueScores.get(key)!.time) {
      uniqueScores.set(key, score);
    }
  }

  const grouped = Object.fromEntries(
    DIFFICULTIES.map((d) => [d, [...uniqueScores.values()].filter((s) => s.difficulty === d)])
  );

  return Response.json(grouped);
}
