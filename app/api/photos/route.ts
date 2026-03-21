import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface Album {
  url: string;
  links: string[];
  thumb: string;
  title: string;
}

interface CachedAlbum extends Album {
  index: number;
}

interface AlbumCache {
  timestamp: number;
  albums: CachedAlbum[];
}

const CACHE_PATH = join(tmpdir(), 'albums.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function readCache(): AlbumCache | null {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    const cache: AlbumCache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
}

function writeCache(albums: CachedAlbum[]) {
  writeFileSync(CACHE_PATH, JSON.stringify({ timestamp: Date.now(), albums }));
}

function extractPhotos(text: string): string[] {
  const EXTRACT_PHOTOS_REGEX = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]*)"/g;
  const links: string[] = [];
  let match;
  while ((match = EXTRACT_PHOTOS_REGEX.exec(text))) {
    links.push(match[1]);
  }
  return links;
}

async function scrapeAlbum(shareUrl: string, retries = 4): Promise<Album | null> {
  const res = await fetch(shareUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (res.status === 429) {
    if (retries <= 0) {
      console.error(`[photos] giving up on ${shareUrl} after repeated 429s`);
      return null;
    }
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
    console.warn(`[photos] 429 on ${shareUrl} — retrying in ${retryAfter}s (${retries} left)`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return scrapeAlbum(shareUrl, retries - 1);
  }

  if (!res.ok) return null;

  const data = await res.text();

  const url = /https:\/\/photos.app.goo.gl\/.+?"/.exec(data);
  const links = extractPhotos(data).map((link) => link + '=w2048');
  const title = /<title>.*<\/title>/g.exec(data);

  if (!title?.length || !url?.length || !links.length) return null;

  return {
    url: url[0].replace(/"$/, ''),
    links,
    thumb: links[0].replace('=w2048', '=w500'),
    title: title[0].replace('<title>', '').replace(' - Google Photos</title>', ''),
  };
}

function buildStream(albums: CachedAlbum[]): Response {
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
  // 1. Static build-time cache (production)
  const buildCachePath = join(process.cwd(), 'public', 'data', 'albums-cache.json');
  if (existsSync(buildCachePath)) {
    const albums: CachedAlbum[] = JSON.parse(readFileSync(buildCachePath, 'utf-8'));
    console.log(`[photos] serving ${albums.length} albums from build cache`);
    return buildStream(albums);
  }

  // 2. Runtime cache (dev)
  const cached = readCache();
  if (cached) {
    console.log(`[photos] serving ${cached.albums.length} albums from runtime cache`);
    return buildStream(cached.albums);
  }

  console.log('[photos] cache miss — scraping albums');

  const filePath = join(process.cwd(), 'public', 'data', 'albums.json');
  const { albums: shareUrls }: { albums: string[] } = JSON.parse(
    readFileSync(filePath, 'utf-8')
  );

  const uniqueUrls = [...new Set(shareUrls)] as string[];
  const encoder = new TextEncoder();
  const results: CachedAlbum[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < uniqueUrls.length; i++) {
        const album = await scrapeAlbum(uniqueUrls[i]);
        if (album) {
          const entry: CachedAlbum = { ...album, index: i };
          results.push(entry);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
          console.log(`[photos] scraped "${album.title}" (${i + 1}/${uniqueUrls.length})`);
        } else {
          console.error(`[photos] failed to scrape ${uniqueUrls[i]}`);
        }
        if (i < uniqueUrls.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
      if (results.length > 0) writeCache(results);
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
