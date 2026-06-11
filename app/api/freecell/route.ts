import { adminDb } from '@/lib/firebase-admin';

interface Score {
  username: string;
  wins: number;
}

export async function GET() {
  const snapshot = await adminDb.collection('freecell').orderBy('wins', 'desc').get();
  const scores: Score[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Score;
    return { username: data.username, wins: data.wins };
  });
  return Response.json(scores);
}
