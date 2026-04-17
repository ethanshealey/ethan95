import { createHmac } from 'crypto';

export const EXPIRY_SECONDS = 1;

export async function POST() {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `wordle:${timestamp}`;
  const hmac = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');

  return Response.json({ token: `${hmac}.${timestamp}` });
}
