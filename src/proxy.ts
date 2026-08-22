import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";

const AUTH_ROUTES = ["/login", "/register"];

/**
 * Runs on every request that matches `config.matcher` below. It reads the
 * cookie mirror of the access token (see `src/store/useAuthStore.ts`) to
 * make a cheap redirect decision before any React renders. This is a
 * defense-in-depth layer on top of `AuthGate`, which handles client-side
 * navigations the proxy never sees re-run.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasToken ? "/feed" : "/login", request.url),
    );
  }

  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  if (!isAuthRoute && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
