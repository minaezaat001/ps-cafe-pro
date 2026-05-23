import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './lib/auth';

const PUBLIC_PATHS = new Set([
  '/login',
  '/sign-up',
  '/_not-found',
]);

const PUBLIC_PATH_PREFIXES = [
  '/menu/',
  '/api/auth/',
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) return NextResponse.next();

  // Check auth token
  const authCookie = request.cookies.get('auth_user');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAccessToken(authCookie.value) as {
    id: string;
    username?: string;
    role: string;
    tenantId?: string | null;
  } | null;

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_user');
    return response;
  }

  // If on login page and already authenticated, redirect to dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based access control
  if (pathname.startsWith('/super-admin') && payload.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const adminPaths = ['/inventory', '/reports', '/staff', '/devices', '/settings'];
  const isAdminPath = adminPaths.some(p => pathname.startsWith(p));
  if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN' && isAdminPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check impersonation cookie (set for SUPER_ADMINs)
  const impersonatedTenantId = request.cookies.get('impersonated_tenant_id')?.value;

  // Inject auth context headers for downstream consumption
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.id));
  requestHeaders.set('x-user-role', String(payload.role));
  if (payload.tenantId) requestHeaders.set('x-tenant-id', String(payload.tenantId));
  if (payload.username) requestHeaders.set('x-username', String(payload.username));
  if (impersonatedTenantId) requestHeaders.set('x-impersonated-tenant-id', impersonatedTenantId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
