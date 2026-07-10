"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by trip CRUD server actions (createTrip, addStop,
 * deleteStop, deleteTrip) and their validation helpers (requireText,
 * requireDate, requireUuid, etc. in actions/trips.ts) — e.g. an end date
 * before the start date, or a name over the 200-character limit. Without
 * this boundary those throws propagate uncaught and Next.js falls back to
 * its generic error page with no way back except a full reload.
 *
 * Kept scoped to app/trips/ (rather than only a single root boundary) so
 * TripsLayout's <Header> keeps rendering above the error UI.
 */
export default function TripsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trip planner error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pt-4">
      <div className="glass-card flex flex-col items-start gap-3 p-6">
        <p
          role="alert"
          className="border-danger-400/40 bg-danger-500/20 text-danger-300 w-full rounded-md border px-3 py-2 text-sm"
        >
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
