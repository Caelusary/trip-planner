import * as Sentry from "@sentry/nextjs";

// Edge runtime — this app's proxy.ts (session-refresh middleware) runs
// here, so edge-side errors need their own init separate from the Node.js
// server config (the edge runtime can't use everything the Node SDK does).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.2,
});
