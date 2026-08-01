"use client";

import { useState, useTransition } from "react";

interface ShareTripToggleProps {
  tripId: string;
  shareToken: string;
  initialEnabled: boolean;
  setSharing: (tripId: string, enabled: boolean) => Promise<void>;
}

/**
 * Toggles the trip's read-only "anyone with the link" sharing on/off and
 * offers a copy-link button while it's on. Optimistic: flips immediately,
 * then reverts if the server action throws (ownership check failing, a
 * network error, etc.).
 */
export function ShareTripToggle({
  tripId,
  shareToken,
  initialEnabled,
  setSharing,
}: ShareTripToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setSharing(tripId, next);
      } catch {
        setEnabled(!next);
      }
    });
  }

  async function handleCopy() {
    const url = `${window.location.origin}/shared/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied/unavailable — nothing more to do silently.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={enabled}
        className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
          enabled
            ? "border-accent-400/40 bg-accent-400/15 text-accent-400"
            : "border-white/30 text-white/90 hover:bg-white/10"
        }`}
      >
        {enabled ? "Sharing: On" : "Sharing: Off"}
      </button>
      {enabled && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
        >
          {copied ? "Link copied!" : "Copy share link"}
        </button>
      )}
    </div>
  );
}
