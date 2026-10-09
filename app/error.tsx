"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  StatusPanel,
  STATUS_BUTTON_GHOST,
  STATUS_BUTTON_PRIMARY,
  userFacingMessage,
} from "@/components/StatusPanel";

/**
 * Root-level fallback for routes outside app/trips/ (/, /login, /signup,
 * /shared). app/trips/error.tsx handles the trip flows so the nav keeps
 * rendering there; this is the safety net everywhere else.
 */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main id="main" className="flex flex-1 items-center justify-center p-6">
      <StatusPanel
        status="Delayed"
        title="Something went wrong"
        body={userFacingMessage(error, "This page hit a snag. Try again in a moment.")}
        alert
      >
        <button type="button" onClick={() => unstable_retry()} className={STATUS_BUTTON_PRIMARY}>
          Try again
        </button>
        <Link href="/" className={STATUS_BUTTON_GHOST}>
          Go home
        </Link>
      </StatusPanel>
    </main>
  );
}
