import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API proxying ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Auth endpoints → let the route handler at /api/auth/[...path] handle them
    // (it properly forwards Set-Cookie headers for refresh token rotation)
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // All other API routes → rewrite to backend
    const backendUrl = new URL(pathname, BACKEND_URL);
    request.nextUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });
    return NextResponse.rewrite(backendUrl);
  }

  // ── Page-level auth redirects ─────────────────────────────────────────────
  const hasRefreshToken = request.cookies.has("refresh_token");

  // Public pages — redirect to /jobs if already authenticated
  // Skip redirect if ?expired param is present (session just failed, avoid loop)
  if (PUBLIC_PATHS.includes(pathname) && hasRefreshToken) {
    const isExpiredRedirect = request.nextUrl.searchParams.has("expired");
    if (
      !isExpiredRedirect &&
      (pathname === "/" || pathname === "/login" || pathname === "/register")
    ) {
      return NextResponse.redirect(new URL("/jobs", request.url));
    }

    // Session expired — clear the stale httpOnly cookie so next load works cleanly
    if (isExpiredRedirect) {
      const response = NextResponse.redirect(
        new URL("/login", request.url),
      );
      response.cookies.delete("refresh_token");
      return response;
    }
  }

  // Protected pages — redirect to /login if not authenticated
  if (!PUBLIC_PATHS.includes(pathname) && !hasRefreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
