import * as Sentry from "@sentry/nextjs";

// Client-side Sentry init. Runs before the app hydrates (Next.js convention
// for this file). No-ops entirely if the DSN isn't set, so local dev
// without a Sentry project configured behaves exactly as before.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  // A modest sample rate — this is a small hobby project, not a
  // high-traffic service, so full tracing isn't needed and keeps the
  // (free-tier) event volume low.
  tracesSampleRate: 0.2,
});

// Required export (per Sentry's own build-time warning) so App Router
// client-side navigations get instrumented as spans/breadcrumbs.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
