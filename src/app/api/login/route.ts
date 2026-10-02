import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/db/queries/users';
import { verifyPassword } from '@/lib/passwordHash';
import { authCookieOptions, createSessionToken, getAuthCookieName } from '@/lib/auth';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Λάθος email ή κωδικός' }, { status: 401 });

  const user = await getUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Λάθος email ή κωδικός' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), createSessionToken(user.id), authCookieOptions);
  return response;
}
