import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, addDoc, Timestamp } from 'firebase/firestore';

interface Score {
  username: string;
  time: string;
  difficulty: string;
  createdAt: Timestamp;
}

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;

export async function GET() {
  const snapshot = await getDocs(query(collection(db, 'minesweeper'), orderBy('time', 'asc')));
  const allScores = snapshot.docs.map((doc) => {
    const data = doc.data() as Score;
    return {
      username: data.username,
      time: data.time,
      difficulty: data.difficulty,
      createdAt: data.createdAt?.toDate().toISOString() ?? '',
    };
  });

  const grouped = Object.fromEntries(
    DIFFICULTIES.map((d) => [d, allScores.filter((s) => s.difficulty === d)])
  );

  return Response.json(grouped);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { username, time, difficulty } = body as { username?: string; time?: string; difficulty?: string };

  if (!username?.trim() || !time?.toString()?.trim() || !difficulty?.trim()) {
    return Response.json({ error: 'username, time, and difficulty are required' }, { status: 400 });
  }

  await addDoc(collection(db, 'minesweeper'), {
    username: username.trim(),
    time,
    difficulty,
    createdAt: Timestamp.now(),
  });

  return Response.json({ success: true }, { status: 201 });
}
