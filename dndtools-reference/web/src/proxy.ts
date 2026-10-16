import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { canonicalEntityPath } from "@/lib/classic-links";
import { unknownServerActionResponse } from "@/lib/server-action-ids";

// The session nonce is no longer minted here. Pages stay static, and the
// browser fetches the nonce from POST /session (see BootstrapProvider).

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "POST") {
    const actionId = request.headers.get("next-action");
    if (actionId) {
      const unknown = unknownServerActionResponse(actionId);
      if (unknown) return unknown;
    }
  }

  const canonical = canonicalEntityPath(pathname);
  if (canonical) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonical;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (pathname.startsWith("/api/") && pathname !== "/api/health") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!authToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!authToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/tools/campaign" || pathname.startsWith("/tools/campaign/")) {
    const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!authToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon, robots, sitemap chunks (/sitemap/N.xml)
     * - common static image extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|llms.txt|llms-full.txt|sitemap/|ws/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
