import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// The Content-Security-Policy is not set here: it carries a per-request
// nonce, so proxy.ts builds it for every response (see lib/csp.ts).

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
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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
