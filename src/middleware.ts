import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add the paths you want to protect here
const protectedPaths = [
  '/projects',
  '/agents',
  '/providers',
  '/skills',
  '/logs',
  '/history'
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Also protect the root home page
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p)) || pathname === '/';
  
  if (isProtectedPath) {
    const session = req.cookies.get('admin_session');
    
    // If not authenticated, redirect to login
    if (!session || session.value !== 'authenticated') {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Explicitly protect certain API routes if accessed directly via browser/client
  // Note: /api/v1 is protected by API_SECRET_KEY, but let's protect /api/setup and other sensitive routes
  const protectedApiPaths = [
    '/api/setup',
    '/api/logs'
  ];
  
  if (protectedApiPaths.some(p => pathname.startsWith(p))) {
    const session = req.cookies.get('admin_session');
    
    if (!session || session.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// Config to optimize when middleware runs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/chat (chat interactions must be public)
     * - api/v1 (auth handled via Bearer token)
     * - api/auth (login endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - chat (chat page must be public)
     * - embed (embed scripts must be public)
     */
    '/((?!api/chat|api/v1|api/auth|_next/static|_next/image|favicon.ico|login|chat|embed).*)',
  ],
};
