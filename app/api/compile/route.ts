import { createHmac, timingSafeEqual } from 'crypto';
import type { CompileRequest, CompileResponse } from '@/types/compile';
import { EXPIRY_SECONDS } from './token/route';

const JUDGE0_URL = 'https://compile.ethanshealey.com/submissions?base64_encoded=true&wait=true';

function verifyToken(token: string, languageId: number): boolean {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [hmac, tsStr] = parts;
    const timestamp = parseInt(tsStr, 10);
    if (isNaN(timestamp)) return false;
    if (Math.floor(Date.now() / 1000) - timestamp > EXPIRY_SECONDS) return false;
    const payload = `${languageId}:${timestamp}`;
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
    const { script, stdin, languageId, token, secureToken } = body;

    if (
        !token || !secureToken ||
        !verifyToken(token, languageId) ||
        !verifySecureToken(token, secureToken)
    ) {
        return Response.json({ error: 'Invalid token' }, { status: 403 });
    }

    const stdinNormalized = (stdin || '').replaceAll(' ', '\n');
    const encode = (s: string) => Buffer.from(s).toString('base64');
    const decode = (s: string | null) => s ? Buffer.from(s, 'base64').toString('utf8') : null;

    const res = await fetch(JUDGE0_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': process.env.JUDGE0_API_TOKEN!,
        },
        body: JSON.stringify({
            source_code: encode(script),
            language_id: languageId,
            stdin: encode(stdinNormalized),
        }),
    });

    const data = await res.json();

    const output = [decode(data.stdout), decode(data.compile_output), decode(data.stderr)]
        .filter(Boolean)
        .join('\n')
        .trimEnd();

    const response: CompileResponse = {
        output,
        status: data.status?.description ?? 'Unknown',
        time: data.time ?? null,
        memory: data.memory ?? null,
    };

    console.log(response)

    return Response.json(response);
}
