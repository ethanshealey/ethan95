import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { EXPIRY_SECONDS } from './token/route';

interface Score {
  username: string;
  wins: number;
  bestGuesses: number;
  lastWin: number;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [hmac, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.floor(Date.now() / 1000) - timestamp > EXPIRY_SECONDS) return false;
  const payload = `wordle:${timestamp}`;
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
  const snapshot = await adminDb.collection('wordle').orderBy('wins', 'desc').get();
  const scores: Score[] = snapshot.docs.map((doc) => {
    const d = doc.data() as Score;
    return { username: d.username, wins: d.wins, bestGuesses: d.bestGuesses, lastWin: d.lastWin };
  });
  return Response.json(scores);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { username, guesses, token, secureToken } = body as {
    username?: string;
    guesses?: number;
    token?: string;
    secureToken?: string;
  };

  if (
    !username?.trim() ||
    typeof guesses !== 'number' || guesses < 1 || guesses > 6 ||
    !token || !verifyToken(token) ||
    !secureToken || !verifySecureToken(token, secureToken)
  ) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const sanitized = username.trim().slice(0, 32);
  const now = Date.now();

  const userDocs = await adminDb.collection('wordle').where('username', '==', sanitized).get();
  const existing = userDocs.docs[0];

  if (!existing) {
    await adminDb.collection('wordle').add({
      username: sanitized,
      wins: 1,
      bestGuesses: guesses,
      lastWin: now,
    });
  } else {
    const current = existing.data() as Score;
    await existing.ref.update({
      wins: FieldValue.increment(1),
      bestGuesses: guesses < current.bestGuesses ? guesses : current.bestGuesses,
      lastWin: now,
    });
  }

  return Response.json({ success: true }, { status: 200 });
}
