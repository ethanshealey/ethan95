import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
  const payload = `solitaire:${timestamp}`;
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
  const snapshot = await adminDb.collection('solitaire').orderBy('wins', 'desc').get();
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
  const existing = await adminDb.collection('solitaire').where('username', '==', sanitized).get();

  if (existing.empty) {
    await adminDb.collection('solitaire').add({ username: sanitized, wins: 1 });
  } else {
    await existing.docs[0].ref.update({ wins: FieldValue.increment(1) });
  }

  return Response.json({ success: true }, { status: 200 });
}
