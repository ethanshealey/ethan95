import { createHmac } from 'crypto';

export const EXPIRY_SECONDS = 30;

export async function POST(request: Request) {
    const { language, versionIndex } = await request.json();

    if (typeof language !== 'string' || !language.trim() || typeof versionIndex !== 'number') {
        return Response.json({ error: 'Invalid' }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${language}:${versionIndex}:${timestamp}`;
    const hmac = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');

    return Response.json({ token: `${hmac}.${timestamp}` });
}
