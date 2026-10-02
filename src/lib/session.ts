import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { getAuthCookieName, verifySessionToken } from './auth';
import { getUserById } from '@/db/queries/users';
import type { User } from '@/db/schema';

/** For Server Components: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<User> {
  const token = (await cookies()).get(getAuthCookieName())?.value;
  const userId = verifySessionToken(token);
  const user = userId === null ? undefined : await getUserById(userId);
  if (!user) redirect('/login');
  return user;
}

/** For Route Handlers: proxy.ts has already verified the session and set x-user-id. */
export function getUserId(request: NextRequest): number {
  const header = request.headers.get('x-user-id');
  const userId = header ? Number(header) : NaN;
  if (!Number.isInteger(userId)) {
    throw new Error('Missing x-user-id header — proxy.ts should have set this for every authenticated request');
  }
  return userId;
}
