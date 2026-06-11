import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs a short-lived score token. `payloadPrefix` binds the token to the
 * specific game (and, for games where the score itself can be forged client-side,
 * to the score values too) so it can't be replayed for a different submission.
 */
export function signToken(payloadPrefix: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${payloadPrefix}:${timestamp}`;
  const hmac = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');
  return `${hmac}.${timestamp}`;
}

export function verifyToken(payloadPrefix: string, token: string, expirySeconds: number): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [hmac, tsStr] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.floor(Date.now() / 1000) - timestamp > expirySeconds) return false;
  const payload = `${payloadPrefix}:${timestamp}`;
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifySecureToken(token: string, secureToken: string): boolean {
  const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(token).digest('base64url');
  try {
    return timingSafeEqual(Buffer.from(secureToken), Buffer.from(expected));
  } catch {
    return false;
  }
}
