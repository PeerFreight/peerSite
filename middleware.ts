import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: portal routes need a session cookie or you go to /login.
 * This only checks cookie presence (fast, edge-safe); every server page and
 * data path re-validates the session and org membership properly.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/settings",
    "/quotes/:path*",
    "/loads/:path*",
    "/admin/:path*",
  ],
};
