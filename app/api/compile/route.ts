import type { CompileRequest, CompileResponse } from '@/types/compile';

const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute'

export async function POST(request: Request) {

    const body: CompileRequest = await request.json();

    const res = await fetch(JDOODLE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': "application/json"
        },
        body: JSON.stringify({
            'clientId': process.env.JDOODLE_CLIENT_ID,
            'clientSecret': process.env.JDOODLE_CLIENT_SECRET,
            'script': body.script,
            'stdin': body.stdin,
            'language': body.language,
            'versionIndex': body.versionIndex
        })
    })

    const data: CompileResponse = await res.json()

    console.log(data)

    return Response.json(data);
}
