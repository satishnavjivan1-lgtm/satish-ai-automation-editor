import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('erp_auth_token')?.value;

  const isLoginPage = pathname === '/login' || pathname === '/forgot-password';
  const isAuthApi = pathname.startsWith('/api/auth');

  // Allow static files, Next.js internals, and auth APIs
  if (
    isAuthApi ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // If user is already authenticated
  if (token) {
    // If going to /login or root /, send directly to dashboard
    if (isLoginPage || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // If user is NOT authenticated
  if (!token) {
    if (isLoginPage) {
      return NextResponse.next();
    }

    // For other API routes, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For all other pages, redirect to /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
