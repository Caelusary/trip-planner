import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content-Security-Policy. Audited against actual usage in this codebase
// (grepped for <script>, <iframe>, analytics SDKs, data: URIs, and every
// external-domain fetch/render) rather than guessed — see the reasoning
// next to each directive below. Only enforced in production: Next's dev
// server (Turbopack HMR/React Refresh) needs 'unsafe-eval' and a
// same-origin websocket that aren't worth encoding into the prod policy,
// and `next dev` isn't what's actually exposed to the internet.
const contentSecurityPolicy = [
  // No implicit allow-list; every other directive below opts in explicitly.
  "default-src 'self'",
  // Real photos are Wikimedia Commons, the fallback placeholder is
  // picsum.photos (both proxied through next/image's `/_next/image`
  // endpoint, so the browser only ever loads from 'self' for those — listed
  // anyway as defense-in-depth in case optimization is ever bypassed, since
  // that's exactly what's pinned in `images.remotePatterns` below).
  // openweathermap.org (not api.openweathermap.org, which is server-only
  // and never touches the browser) IS fetched directly by the browser: the
  // per-day forecast icon in components/WeatherHorizon.tsx is a raw SVG
  // <image href="https://openweathermap.org/img/wn/..."> rendered on the
  // trip detail page, not a next/image element — omitting it would silently
  // blank out every forecast icon.
  "img-src 'self' https://upload.wikimedia.org https://picsum.photos https://openweathermap.org",
  // next/font (Geist, Fraunces) downloads and self-hosts font files at
  // build time under /_next/static/media — served same-origin, no data:
  // URIs or third-party font CDN involved (verified no @font-face/data:
  // font in globals.css).
  "font-src 'self'",
  // This app renders extensive per-render dynamic inline styles (drag
  // transforms/opacity/z-index in CarouselStack/AttractionMorphView, slider
  // fill in BudgetFilter) via React's `style={{...}}` prop, which emits a
  // real `style="..."` HTML attribute on the server-rendered markup for
  // these client components. That's governed by style-src same as a <style>
  // tag, and the values are computed per-render (drag position, slot math),
  // so hashing them isn't practical. 'unsafe-inline' is required here;
  // CSS-injection risk is real but far lower severity than script-src's.
  "style-src 'self' 'unsafe-inline'",
  // Next.js inlines the RSC/hydration bootstrap payload as a <script> tag
  // with no nonce unless middleware mints one and threads it through (the
  // documented Next.js CSP-nonce recipe) — out of scope here since proxy.ts
  // isn't to be touched this pass. 'unsafe-inline' is the required
  // fallback; no 'unsafe-eval' since that's only needed by dev-mode
  // HMR/React Refresh, which this policy doesn't apply to (see above).
  "script-src 'self' 'unsafe-inline'",
  // Every third-party integration in this app is server-only: Supabase
  // (lib/supabase/server.ts, proxy.ts) is only ever called from Server
  // Components/Actions/edge middleware — there's no createBrowserClient
  // anywhere in the repo, so the browser itself never opens an XHR/fetch to
  // *.supabase.co. OpenWeatherMap's data API (lib/weather.ts) is guarded by
  // `import "server-only"` and is only called from Server Components/route
  // handlers. So the browser only ever needs to talk to itself (Server
  // Actions, /api/geocode, /api/geolocate all being same-origin POSTs/GETs)
  // — plus Sentry's ingest endpoint (instrumentation-client.ts), the one
  // deliberate exception: client-side errors are reported directly from the
  // browser, not proxied through this app's own server.
  "connect-src 'self' https://*.ingest.us.sentry.io",
  // All forms in this app (login, signup, add/delete stop, delete trip)
  // post to Next.js Server Actions on the same origin; there's no external
  // form target anywhere.
  "form-action 'self'",
  // No plugin/object embeds anywhere in the app.
  "object-src 'none'",
  // Prevents a stray <base> tag from redirecting relative URLs off-origin.
  "base-uri 'self'",
  // Modern equivalent of X-Frame-Options: DENY (kept below too, for older
  // browsers that don't parse CSP2 frame-ancestors).
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  // Disallow embedding in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin only on cross-origin requests, full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of browser features this app never uses. geolocation is scoped
  // to same-origin (not fully disabled) — lib/useUserCountry.ts uses it to
  // detect the visitor's country for the Top Attractions carousel.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  // Force HTTPS for a year, including subdomains, once a browser has seen
  // this header once (safe no-op locally since dev runs over HTTP).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    // The only two external image hosts the app ever renders: real
    // attraction/activity photos (lib/activity-images.ts,
    // lib/attraction-images.ts) come from Wikimedia Commons, and
    // lib/attractions.ts falls back to a picsum.photos placeholder for any
    // attraction id that isn't in the generated photo map. Paths are
    // per-id/dynamic, so only the hostnames are pinned here.
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    const headers = [...securityHeaders];
    // Only enforce CSP in production — see the comment on
    // `contentSecurityPolicy` above for why dev is excluded.
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Content-Security-Policy",
        value: contentSecurityPolicy,
      });
    }
    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
};

// Wraps the build to upload source maps to Sentry for readable stack
// traces — inert (falls back to the plain config, verified: the plugin
// skips upload entirely) unless SENTRY_AUTH_TOKEN is set, which it isn't
// yet. `org`/`project` below are placeholders, not real values — only the
// DSN's numeric org/project IDs are known here, not their human-readable
// slugs. Fill these in (visible in your Sentry dashboard's URL) and add
// SENTRY_AUTH_TOKEN (Settings > Auth Tokens on sentry.io) as an env var to
// enable source map upload; until then this has no effect on the build.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: true,
  // Not `disableLogger` — deprecated, and explicitly unsupported under
  // Turbopack (which this app's dev/build both use) per Sentry's own
  // build-time warning. This is the documented Turbopack-compatible
  // replacement.
  webpack: { treeshake: { removeDebugLogging: true } },
  telemetry: false,
});
