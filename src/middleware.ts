import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/events',
  '/api/pickup-points',
  '/api/queue-status',
  '/api/demand-forecasts',
  '/api/routes',
];

// Routes where GET is public but mutations require auth
const PUBLIC_READ_API_ROUTES = [
  '/api/buses',
  '/api/notifications',
];

// Routes where POST is public (pre-registration for passengers)
const PUBLIC_POST_ROUTES = [
  '/api/preregister',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicReadRoute(pathname: string): boolean {
  return PUBLIC_READ_API_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function isPublicPostRoute(pathname: string): boolean {
  return PUBLIC_POST_ROUTES.some(route => pathname === route);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow all auth routes (login, signup, NextAuth handlers)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow GET on public read routes
  if (isPublicReadRoute(pathname) && request.method === 'GET') {
    return NextResponse.next();
  }

  // Allow POST on public post routes (e.g., preregister for passengers)
  if (isPublicPostRoute(pathname) && request.method === 'POST') {
    return NextResponse.next();
  }

  // For all other API routes, require authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
