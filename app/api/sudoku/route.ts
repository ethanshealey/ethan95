import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, where, addDoc, updateDoc, increment } from 'firebase/firestore';
import { EXPIRY_SECONDS } from './token/route';

interface Score {
  username: string;
  wins: number;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [hmac, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.floor(Date.now() / 1000) - timestamp > EXPIRY_SECONDS) return false;
  const payload = `sudoku:${timestamp}`;
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

function verifySecureToken(token: string, secureToken: string): boolean {
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(token).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(secureToken), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET() {
  const snapshot = await getDocs(query(collection(db, 'sudoku'), orderBy('wins', 'desc')));
  const scores: Score[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Score;
    return { username: data.username, wins: data.wins };
  });
  return Response.json(scores);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { username, token, secureToken } = body as {
    username?: string;
    token?: string;
    secureToken?: string;
  };

  if (
    !username?.trim() ||
    !token || !verifyToken(token) ||
    !secureToken || !verifySecureToken(token, secureToken)
  ) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const sanitized = username.trim().slice(0, 32);
  const existing = await getDocs(query(collection(db, 'sudoku'), where('username', '==', sanitized)));

  if (existing.empty) {
    await addDoc(collection(db, 'sudoku'), { username: sanitized, wins: 1 });
  } else {
    await updateDoc(existing.docs[0].ref, { wins: increment(1) });
  }

  return Response.json({ success: true }, { status: 200 });
}
