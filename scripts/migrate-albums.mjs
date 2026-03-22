import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Parse .env.local manually
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('='))
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

const albums = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'albums-cache.json'), 'utf-8'));
const albumsCol = collection(db, 'albums');

console.log(`Migrating ${albums.length} albums...`);

for (const album of albums) {
  const doc = await addDoc(albumsCol, {
    url: album.url,
    title: album.title,
    thumb: album.thumb,
    links: album.links,
    index: album.index,
    create_ts: Timestamp.now(),
  });
  console.log(`  Wrote "${album.title}" → ${doc.id}`);
}

console.log('Done.');
process.exit(0);
