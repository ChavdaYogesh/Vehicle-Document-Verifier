import { NextResponse } from 'next/server';

export function middleware(request) {
  const sessionToken = request.cookies.get('session_token');
  const { pathname } = request.nextUrl;

  // Protect the dashboard route
  if (pathname === '/' && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Prevent logged-in users from seeing the login/signup pages
  if ((pathname === '/login' || pathname === '/signup') && sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup'],
};
