import "server-only";

/**
 * In-memory, per-instance fixed-window rate limiter. Good enough to blunt
 * scripted abuse of the (unauthenticated) geocoding routes without adding an
 * external dependency — not a hard guarantee under multi-instance serverless
 * scaling, since each instance keeps its own counters.
 */

const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

// Bound memory: sweep expired entries every time the map grows past this size.
const MAX_ENTRIES = 5000;

export function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > MAX_ENTRIES) {
      for (const [k, v] of hits) {
        if (now >= v.resetAt) hits.delete(k);
      }
    }
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

export function clientKey(request: Request): string {
  return clientKeyFromHeaders(request.headers);
}

/** Same lookup as {@link clientKey}, for callers (server actions) that only have `next/headers`, not a `Request`. */
export function clientKeyFromHeaders(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  return forwardedFor?.split(",")[0].trim() || "unknown";
}
