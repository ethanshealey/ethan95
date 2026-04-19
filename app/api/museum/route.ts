import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { MuseumItem, MuseumResponse } from '@/types/museum';

export async function GET() {
  const [camerasSnap, computersSnap, consolesSnap] = await Promise.all([
    getDocs(query(collection(db, 'museum_cameras'),   orderBy('year', 'asc'))),
    getDocs(query(collection(db, 'museum_computers'), orderBy('year', 'asc'))),
    getDocs(query(collection(db, 'museum_consoles'),  orderBy('year', 'asc'))),
  ]);

  const body: MuseumResponse = {
    cameras:   camerasSnap.docs.map((d)   => d.data() as MuseumItem),
    computers: computersSnap.docs.map((d) => d.data() as MuseumItem),
    consoles:  consolesSnap.docs.map((d)  => d.data() as MuseumItem),
  };

  return Response.json(body);
}
