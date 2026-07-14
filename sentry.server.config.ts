import * as Sentry from "@sentry/nextjs";

// Node.js runtime (Server Components, Server Actions, route handlers).
// Imported from instrumentation.ts — see that file for why this is split
// per-runtime instead of one shared config.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.2,
});
