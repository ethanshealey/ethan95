import { timingSafeEqual } from 'crypto';
import { signSessionToken } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!password || !process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passwordBuf = Buffer.from(password);
  const secretBuf = Buffer.from(process.env.ADMIN_SECRET);

  let valid = false;
  if (passwordBuf.length === secretBuf.length) {
    try {
      valid = timingSafeEqual(passwordBuf, secretBuf);
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ token: signSessionToken() });
}
