import { adminDb } from '@/lib/firebase-admin';
import type { MuseumItem, MuseumResponse } from '@/types/museum';

export async function GET() {
  const [camerasSnap, computersSnap, consolesSnap] = await Promise.all([
    adminDb.collection('museum_cameras').orderBy('year', 'asc').get(),
    adminDb.collection('museum_computers').orderBy('year', 'asc').get(),
    adminDb.collection('museum_consoles').orderBy('year', 'asc').get(),
  ]);

  const body: MuseumResponse = {
    cameras:   camerasSnap.docs.map((d) => d.data() as MuseumItem),
    computers: computersSnap.docs.map((d) => d.data() as MuseumItem),
    consoles:  consolesSnap.docs.map((d) => d.data() as MuseumItem),
  };

  return Response.json(body);
}
