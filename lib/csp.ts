/**
 * Content-Security-Policy, built per request by proxy.ts with a fresh
 * nonce. Audited against what this app actually loads; see the note on
 * each directive.
 *
 * Production only: `next dev` (Turbopack HMR / React Refresh) needs
 * 'unsafe-eval' and inline scripts that aren't worth encoding here, and the
 * dev server isn't what's exposed to the internet.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    // No implicit allow-list; every other directive opts in explicitly.
    "default-src 'self'",
    // Nonce + 'strict-dynamic': Next stamps this request's nonce on its own
    // bootstrap and chunk <script> tags (it reads the nonce from the CSP
    // request header proxy.ts sets), and scripts those load are trusted
    // transitively. No 'unsafe-inline', so an injected inline <script> or
    // event handler can't run. ('unsafe-inline' would be ignored by
    // CSP3 browsers anyway once a nonce is present.)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // React writes per-render `style="..."` attributes (carousel drag
    // transforms, budget slider fill), which a nonce can't cover: style
    // attributes only accept 'unsafe-inline' (or per-value hashes, which
    // isn't practical for values computed per frame). CSS injection is far
    // lower risk than script injection, which stays locked down above.
    "style-src 'self' 'unsafe-inline'",
    // Attraction photos come from Wikimedia Commons with a picsum.photos
    // fallback, both normally proxied through next/image (so 'self'); kept
    // as a fallback in case optimisation is bypassed. openweathermap.org
    // serves the raw forecast icon <img>s. tile.openstreetmap.org serves
    // the Leaflet map tiles (pinned per subdomain, no wildcard).
    "img-src 'self' https://upload.wikimedia.org https://picsum.photos https://openweathermap.org https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
    // next/font self-hosts Geist, Geist Mono and Fraunces under /_next.
    "font-src 'self'",
    // Supabase and OpenWeatherMap are only ever called server-side; the
    // browser talks to this origin (server actions, /api/*) and to
    // Sentry's ingest endpoint for client error reports.
    "connect-src 'self' https://*.ingest.us.sentry.io",
    // Every form posts to a same-origin server action.
    "form-action 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Modern equivalent of X-Frame-Options: DENY (also sent, for old browsers).
    "frame-ancestors 'none'",
  ].join("; ");
}

/** A fresh base64 nonce for one request. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
