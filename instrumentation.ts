import * as Sentry from "@sentry/nextjs";

// Next.js calls this once per server runtime on boot. NEXT_RUNTIME tells us
// which one we're in, since Node.js and Edge need separate Sentry configs
// (proxy.ts runs on the edge runtime; everything else server-side runs on
// Node.js).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
