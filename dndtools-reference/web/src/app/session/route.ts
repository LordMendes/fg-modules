import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  isCrossSiteRequest,
  resolveBootstrapSession,
} from "@/lib/session";

/** Each full page load calls this once. The limit is per client IP and allows several tabs. */
const BOOTSTRAP_LIMIT = 120;
const BOOTSTRAP_WINDOW_MS = 60_000;

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Client bootstrap for the session nonce and the signed-in user. Pages stay
 * static, so the browser fetches this once on mount instead of every page
 * render reading cookies. A route handler rather than a server action: an
 * action that sets a cookie makes Next re-render the current page.
 */
export async function POST(request: NextRequest) {
  if (isCrossSiteRequest(request.headers)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: NO_STORE },
    );
  }

  const limit = rateLimit(
    `session-bootstrap:${getClientIp(request.headers)}`,
    BOOTSTRAP_LIMIT,
    BOOTSTRAP_WINDOW_MS,
  );
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(retryAfter) } },
    );
  }

  const { session, token, isNew } = resolveBootstrapSession(
    request.cookies.get(COOKIE_NAME)?.value,
  );
  const user = await getCurrentUser();

  const response = NextResponse.json(
    { nonce: session.nonce, user },
    { headers: NO_STORE },
  );
  if (isNew) {
    response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  }
  return response;
}
