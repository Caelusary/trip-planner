"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root-level error boundary — catches anything that escapes every other
 * boundary in the app, including errors in the root layout itself (which
 * app/trips/error.tsx and friends can't reach, since they render inside
 * it). Next.js requires this to render its own <html>/<body> since the
 * root layout may be what threw.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <p>Something went wrong. Please refresh the page.</p>
        </div>
      </body>
    </html>
  );
}
