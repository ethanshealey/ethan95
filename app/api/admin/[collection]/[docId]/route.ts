import { adminDb } from '@/lib/firebase-admin';
import { verifySessionToken } from '@/lib/admin-auth';

const ALLOWED_COLLECTIONS = ['minesweeper', 'albums', 'solitaire', 'sudoku', 'museum_cameras', 'museum_computers', 'museum_consoles'] as const;

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ collection: string; docId: string }> }
) {
  const token = getToken(request);
  if (!token || !verifySessionToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { collection: col, docId } = await params;
  if (!ALLOWED_COLLECTIONS.includes(col as (typeof ALLOWED_COLLECTIONS)[number])) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const updates = await request.json();
  delete updates.id;

  await adminDb.collection(col).doc(docId).update(updates);
  return Response.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection: string; docId: string }> }
) {
  const token = getToken(request);
  if (!token || !verifySessionToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { collection: col, docId } = await params;
  if (!ALLOWED_COLLECTIONS.includes(col as (typeof ALLOWED_COLLECTIONS)[number])) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await adminDb.collection(col).doc(docId).delete();
  return Response.json({ success: true });
}
