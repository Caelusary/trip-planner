import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * The current signed-in user, memoized per request via React's `cache()` —
 * every Server Component that calls this during the same render (the trips
 * layout AND whichever page it's wrapping both need it independently) shares
 * one Supabase auth call instead of each re-validating the session against
 * Supabase's server on its own. Verified live: a single `/trips/*` page load
 * previously made up to 3 sequential `getUser()` round-trips (this project's
 * Supabase instance runs in ap-southeast-2, so each one is real
 * cross-region latency, not a local call) — proxy.ts's middleware, the trips
 * layout, and the page itself. The middleware's call runs in a separate
 * execution context (Edge Runtime, before the render even starts) so it
 * isn't part of this cache and stays a separate call by necessity — but the
 * layout+page redundancy was pure waste this removes.
 *
 * Returns just the user, not a Supabase client — callers that also need a
 * client for other queries still call `createClient()` themselves (cheap,
 * no network I/O on its own; only `.auth.getUser()` actually hits Supabase).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
