import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    const isLoginPage = req.nextUrl.pathname.startsWith('/login');
    const isAuthed = !!req.nextauth.token;

    if (isLoginPage && isAuthed) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: '/login' },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/login')) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/auth (NextAuth)
     * - /api/health (public health endpoint)
     * - /_next/* (Next internals)
     * - /favicon.ico, images
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)',
  ],
};
