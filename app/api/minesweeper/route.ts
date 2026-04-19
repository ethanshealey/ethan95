import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
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

function verifySecureToken(token: string, secureToken: string): boolean {
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(token).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(secureToken), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { username, time, difficulty, token, secureToken } = body as {
    username?: string;
    time?: number;
    difficulty?: string;
    token?: string;
    secureToken?: string;
  };

  if (
    !username?.trim() ||
    typeof time !== 'number' || time < 1 || time > 999 ||
    !DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number]) ||
    !token || !verifyToken(token, time, difficulty!) ||
    !secureToken || !verifySecureToken(token, secureToken)
  ) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }

  await adminDb.collection('minesweeper').add({
    username: username.trim().slice(0, 32),
    time,
    difficulty,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ success: true }, { status: 201 });
}
