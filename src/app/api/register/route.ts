import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser, getUserByEmail } from '@/db/queries/users';
import { hashPassword } from '@/lib/passwordHash';
import { authCookieOptions, createSessionToken, getAuthCookieName } from '@/lib/auth';
import { accountSchema } from '@/lib/validation';

const registerSchema = z.object({
  name: z.string().trim().max(120).default(''),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const tz = accountSchema.shape.timezone.safeParse(parsed.data.timezone);
  const timezone = tz.success && tz.data ? tz.data : 'UTC';

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const user = await createUser({ email, name, timezone, passwordHash: hashPassword(password) });
  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(getAuthCookieName(), createSessionToken(user.id), authCookieOptions);
  return response;
}
