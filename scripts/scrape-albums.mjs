import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = join(ROOT, 'public', 'data', 'albums.json');
const OUTPUT = join(ROOT, 'public', 'data', 'albums-cache.json');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractPhotos(text) {
  const regex = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]*)"/g;
  const links = [];
  let match;
  while ((match = regex.exec(text))) links.push(match[1]);
  return links;
}

async function scrapeAlbum(shareUrl, retries = 4) {
  const res = await fetch(shareUrl, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });

  if (res.status === 429) {
    if (retries <= 0) {
      console.error(`  giving up on ${shareUrl} after repeated 429s`);
      return null;
    }
    const wait = parseInt(res.headers.get('Retry-After') ?? '10', 10);
    console.warn(`  429 — retrying in ${wait}s (${retries} left)`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return scrapeAlbum(shareUrl, retries - 1);
  }

  if (!res.ok) return null;

  const data = await res.text();
  const url = /https:\/\/photos.app.goo.gl\/.+?"/.exec(data);
  const links = extractPhotos(data).map((l) => l + '=w2048');
  const title = /<title>.*<\/title>/g.exec(data);

  if (!title?.length || !url?.length || !links.length) return null;

  return {
    url: url[0].replace(/"$/, ''),
    links,
    thumb: links[0].replace('=w2048', '=w500'),
    title: title[0].replace('<title>', '').replace(' - Google Photos</title>', ''),
  };
}

const { albums: shareUrls } = JSON.parse(readFileSync(INPUT, 'utf-8'));
const uniqueUrls = [...new Set(shareUrls)];
const results = [];

console.log(`Scraping ${uniqueUrls.length} albums...`);

for (let i = 0; i < uniqueUrls.length; i++) {
  process.stdout.write(`  [${i + 1}/${uniqueUrls.length}] `);
  const album = await scrapeAlbum(uniqueUrls[i]);
  if (album) {
    results.push({ ...album, index: i });
    console.log(`"${album.title}" — ${album.links.length} photos`);
  } else {
    console.log('FAILED');
  }
  if (i < uniqueUrls.length - 1) await new Promise((r) => setTimeout(r, 1000));
}

writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
console.log(`\nWrote ${results.length} albums to ${OUTPUT}`);
