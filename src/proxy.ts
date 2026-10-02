import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookieName, verifySessionToken } from '@/lib/auth';

// Paths reachable without a session — auth pages and the API endpoints that establish one.
const PUBLIC_PATHS = new Set(['/login', '/register', '/api/login', '/api/register']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never trust a client-supplied identity header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const userId = verifySessionToken(request.cookies.get(getAuthCookieName())?.value);

  if (userId === null) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  requestHeaders.set('x-user-id', String(userId));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
