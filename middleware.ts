/**
 * Next.js Middleware
 * Handles authentication, CSP, and request processing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cspMiddleware } from '@/middleware/csp';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/meeting',
  '/settings',
  '/analytics',
  '/admin',
  '/voice-identification',
  '/voice-library'
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/auth/login', '/auth/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply CSP headers
  let response = cspMiddleware(request);
  
  // Check authentication (simplified - in production, verify JWT)
  const token = request.cookies.get('auth-token');
  const isAuthenticated = !!token;
  
  // Redirect to login if accessing protected route without auth
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect to dashboard if accessing auth routes while authenticated
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};