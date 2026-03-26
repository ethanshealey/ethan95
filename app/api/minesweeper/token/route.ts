import { createHmac } from 'crypto';

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;
export const EXPIRY_SECONDS = 300;

export async function POST(request: Request) {
  const { time, difficulty } = await request.json();

  if (!DIFFICULTIES.includes(difficulty) || typeof time !== 'number' || time < 1 || time > 999) {
    return Response.json({ error: 'Invalid' }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${time}:${difficulty}:${timestamp}`;
  const hmac = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');

  return Response.json({ token: `${hmac}.${timestamp}` });
}
