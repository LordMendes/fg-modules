import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_NONCE_HEADER,
  buildSessionToken,
  createSession,
  parseSessionToken,
} from "@/lib/session";

function ensureSession(request: NextRequest) {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  const session = parseSessionToken(existing);
  if (session) {
    return { session, token: existing!, isNew: false };
  }

  const fresh = createSession();
  return { session: fresh, token: buildSessionToken(fresh), isNew: true };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && pathname !== "/api/health") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session, token, isNew } = ensureSession(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_NONCE_HEADER, session.nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isNew) {
    response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
