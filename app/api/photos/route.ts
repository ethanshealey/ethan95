import { adminDb } from '@/lib/firebase-admin';

interface Album {
  url: string;
  links: string[];
  thumb: string;
  title: string;
  index: number;
}

function buildStream(albums: Album[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const album of albums) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(album)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function GET() {
  const snapshot = await adminDb.collection('albums').orderBy('create_ts', 'asc').get();
  const albums: Album[] = snapshot.docs.map((doc) => doc.data() as Album);
  return buildStream(albums);
}
