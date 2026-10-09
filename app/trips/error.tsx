"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import {
  StatusPanel,
  STATUS_BUTTON_GHOST,
  STATUS_BUTTON_PRIMARY,
  userFacingMessage,
} from "@/components/StatusPanel";

/**
 * Catches errors thrown by trip CRUD server actions (createTrip, addStop,
 * deleteStop, deleteTrip), their validation helpers, and failed trip
 * queries (lib/trips.ts throws instead of returning an empty list). Scoped
 * to app/trips/ so TripsLayout's nav bar keeps rendering alongside it.
 *
 * `unstable_retry` (Next 16.2), not `reset`: reset only re-renders the
 * cached children, so after a failed server fetch it showed the same
 * error again. Retry re-fetches the segment.
 */
export default function TripsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Trip planner error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-5xl justify-center pt-6 md:pt-12">
      <StatusPanel
        status="Delayed"
        title="That didn't go through"
        body={userFacingMessage(
          error,
          "We couldn't reach your trips just now. Nothing was lost; try again in a moment.",
        )}
        alert
      >
        <button type="button" onClick={() => unstable_retry()} className={STATUS_BUTTON_PRIMARY}>
          Try again
        </button>
        <Link href="/trips/upcoming" className={STATUS_BUTTON_GHOST}>
          Back to my trips
        </Link>
      </StatusPanel>
    </div>
  );
}
