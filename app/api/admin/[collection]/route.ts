import { db } from '@/lib/firebase';
import { collection as firestoreCollection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { verifySessionToken } from '@/lib/admin-auth';

const ALLOWED_COLLECTIONS = ['minesweeper', 'albums'] as const;

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const token = getToken(request);
  if (!token || !verifySessionToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { collection: col } = await params;
  if (!ALLOWED_COLLECTIONS.includes(col as (typeof ALLOWED_COLLECTIONS)[number])) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const snapshot = await getDocs(firestoreCollection(db, col));
  const docs = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const serialized: Record<string, unknown> = { id: docSnap.id };
    for (const [k, v] of Object.entries(data)) {
      serialized[k] = v != null && typeof v === 'object' && 'toDate' in v
        ? (v as { toDate: () => Date }).toDate().toISOString()
        : v;
    }
    return serialized;
  });

  return Response.json({ docs });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const token = getToken(request);
  if (!token || !verifySessionToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { collection: col } = await params;
  if (!ALLOWED_COLLECTIONS.includes(col as (typeof ALLOWED_COLLECTIONS)[number])) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  if (col === 'albums') {
    body.create_ts = Timestamp.now();
    if (typeof body.links === 'string') {
      try { body.links = JSON.parse(body.links); } catch { /* leave as-is */ }
    }
  }
  const docRef = await addDoc(firestoreCollection(db, col), body);
  return Response.json({ id: docRef.id }, { status: 201 });
}
