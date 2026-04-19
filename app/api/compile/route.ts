import { createHmac, timingSafeEqual } from 'crypto';
import type { CompileRequest, CompileResponse } from '@/types/compile';
import { EXPIRY_SECONDS } from './token/route';

const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute'

function verifyToken(token: string, language: string, versionIndex: number): boolean {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [hmac, tsStr] = parts;
    const timestamp = parseInt(tsStr, 10);
    if (isNaN(timestamp)) return false;
    if (Math.floor(Date.now() / 1000) - timestamp > EXPIRY_SECONDS) return false;
    const payload = `${language}:${versionIndex}:${timestamp}`;
    const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(payload).digest('base64url');
    try {
        return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
    } catch {
        return false;
    }
}

function verifySecureToken(token: string, secureToken: string): boolean {
    const expected = createHmac('sha256', process.env.SCORE_SECRET!).update(token).digest('base64url');
    try {
        return timingSafeEqual(Buffer.from(secureToken), Buffer.from(expected));
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    const body: CompileRequest = await request.json();
    const { script, stdin, language, versionIndex, token, secureToken } = body;

    if (
        !token || !secureToken ||
        !verifyToken(token, language, versionIndex) ||
        !verifySecureToken(token, secureToken)
    ) {
        return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    const res = await fetch(JDOODLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientId: process.env.JDOODLE_CLIENT_ID,
            clientSecret: process.env.JDOODLE_CLIENT_SECRET,
            script,
            stdin,
            language,
            versionIndex,
        })
    });

    const data: CompileResponse = await res.json();
    return Response.json(data);
}
