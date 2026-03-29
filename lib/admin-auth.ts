import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_EXPIRY = 3600; // 1 hour

export function signSessionToken(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `admin:${timestamp}`;
  const hmac = createHmac('sha256', process.env.ADMIN_SECRET!).update(payload).digest('base64url');
  return `${hmac}.${timestamp}`;
}

export function verifySessionToken(token: string): boolean {
  if (!process.env.ADMIN_SECRET) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [hmac, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.floor(Date.now() / 1000) - timestamp > SESSION_EXPIRY) return false;
  const payload = `admin:${timestamp}`;
  const expected = createHmac('sha256', process.env.ADMIN_SECRET).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}
