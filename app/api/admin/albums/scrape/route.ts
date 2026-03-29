import { verifySessionToken } from '@/lib/admin-auth';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractPhotos(html: string): string[] {
  const regex = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]*)"/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(html))) links.push(match[1]);
  return links;
}

export async function POST(request: Request) {
  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifySessionToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' });
  } catch {
    return Response.json({ error: 'Failed to reach URL' }, { status: 400 });
  }

  if (!res.ok) {
    return Response.json({ error: `Album fetch failed (HTTP ${res.status})` }, { status: 400 });
  }

  const html = await res.text();
  const links = extractPhotos(html).map((l) => `${l}=w2048`);

  if (!links.length) {
    return Response.json(
      { error: 'No photos found — is this a public Google Photos album?' },
      { status: 400 }
    );
  }

  const urlMatch = /https:\/\/photos\.app\.goo\.gl\/[^"]+/.exec(html);
  const titleMatch = /<title>([^<]*)<\/title>/.exec(html);
  const title = titleMatch
    ? titleMatch[1].replace(/ - Google Photos$/, '').trim()
    : '';

  return Response.json({
    url: urlMatch ? urlMatch[0] : url,
    title,
    thumb: links[0].replace('=w2048', '=w500'),
    links,
  });
}
