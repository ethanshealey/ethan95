import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, addDoc, Timestamp } from 'firebase/firestore';
import { EXPIRY_SECONDS } from './token/route';

interface Score {
  username: string;
  time: string;
  difficulty: string;
  createdAt: Timestamp;
}

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;

function verifyToken(token: string, time: number, difficulty: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [hmac, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.floor(Date.now() / 1000) - timestamp > EXPIRY_SECONDS) return false;
  const payload = `${time}:${difficulty}:${timestamp}`;
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

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
  const { username, time, difficulty, token } = body as {
    username?: string;
    time?: number;
    difficulty?: string;
    token?: string;
  };

  if (
    !username?.trim() ||
    typeof time !== 'number' || time < 1 || time > 999 ||
    !DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number]) ||
    !token || !verifyToken(token, time, difficulty!)
  ) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }

  await addDoc(collection(db, 'minesweeper'), {
    username: username.trim().slice(0, 32),
    time,
    difficulty,
    createdAt: Timestamp.now(),
  });

  return Response.json({ success: true }, { status: 201 });
}
