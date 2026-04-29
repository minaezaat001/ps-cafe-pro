import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './lib/auth';

export default async function proxy(request: NextRequest) {
  const authUser = request.cookies.get('auth_user');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isSignUpPage = request.nextUrl.pathname === '/sign-up';
  const isMenuPage = request.nextUrl.pathname.startsWith('/menu');
  const isPublicApi = request.nextUrl.pathname.startsWith('/api/print');

  // 1. If not logged in and not on a public page, redirect to /login
  if (!authUser && !isLoginPage && !isSignUpPage && !isMenuPage && !isPublicApi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If logged in (has cookie)
  if (authUser) {
    const user = (await verifyAccessToken(authUser.value)) as {
      id: string;
      username: string;
      role: string;
    } | null;

    // If cookie exists but token is invalid/expired
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_user'); // Clear the invalid cookie
      return response;
    }

    // If on login page and already authenticated, redirect to dashboard
    if (isLoginPage) return NextResponse.redirect(new URL('/', request.url));

    // Role-based access control
    if (request.nextUrl.pathname.startsWith('/super-admin') && user.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const adminPaths = ['/inventory', '/reports', '/staff', '/devices', '/settings'];
    const isAdminPath = adminPaths.some(path =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && isAdminPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
