import { adminDb } from '@/lib/firebase-admin';

interface Score {
  username: string;
  wins: number;
  bestGuesses: number;
  lastWin: number;
  isHardMode: boolean;
  isBot: boolean;
}

export async function GET() {
  const snapshot = await adminDb.collection('wordle').orderBy('wins', 'desc').get();
  const scores: Score[] = snapshot.docs.map((doc) => {
    const d = doc.data() as Score;
    return {
      username: d.username,
      wins: d.wins,
      bestGuesses: d.bestGuesses,
      lastWin: d.lastWin,
      isHardMode: d.isHardMode === true,
      isBot: d.isBot === true,
    };
  });
  return Response.json(scores);
}
