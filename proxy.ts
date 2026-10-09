import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { buildContentSecurityPolicy, createNonce } from "@/lib/csp";

export async function proxy(request: NextRequest) {
  // Per-request CSP nonce (production only, see lib/csp.ts). Next reads the
  // policy off the *request* headers to know which nonce to stamp on its
  // scripts, and the browser enforces the copy on the response.
  const csp =
    process.env.NODE_ENV === "production" ? buildContentSecurityPolicy(createNonce()) : null;

  // Rebuilt on every call (not copied once up front) so cookies Supabase
  // writes onto `request` in setAll below are carried through too.
  const next = () => {
    if (!csp) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  let supabaseResponse = next();

  const { url: supabaseUrl, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = next();
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() throws (rather than returning { user: null }) when the
  // request carries a stale/rotated refresh-token cookie — e.g. an old
  // browser tab open across a token rotation. Treat that the same as
  // "signed out" instead of letting it propagate: Next.js's edge runtime
  // fails open on an uncaught middleware error (skipping the redirect
  // logic below), which happened to be masked by each page's own
  // independent auth check, but relying on that instead of handling the
  // case on purpose just spams the error logs for a routine occurrence.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Shared trip links are the one deliberately public, no-login page —
  // gated by knowing the trip's own unguessable token (see the
  // get_shared_trip/get_shared_trip_stops functions), not by session.
  const isPublicSharedTrip = pathname.startsWith("/shared/");

  if (!user && !isAuthPage && !isPublicSharedTrip && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/trips";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
