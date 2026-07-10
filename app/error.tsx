"use client";

import { useEffect } from "react";

/**
 * Root-level fallback for routes outside app/trips/ (/, /login, /signup).
 * app/trips/error.tsx handles the trip CRUD flows specifically so the
 * <Header> keeps rendering there; this is just a safety net so an
 * unexpected throw anywhere else doesn't fall through to Next's bare
 * default error page.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card flex w-full max-w-sm flex-col items-start gap-3 p-8">
        <h1 className="font-display text-lg font-semibold">Something went wrong</h1>
        <p
          role="alert"
          className="border-danger-400/40 bg-danger-500/20 text-danger-300 w-full rounded-md border px-3 py-2 text-sm"
        >
          {error.message || "Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
