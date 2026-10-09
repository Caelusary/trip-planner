"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";

interface ShareTripToggleProps {
  tripId: string;
  shareToken: string;
  initialEnabled: boolean;
  setSharing: (tripId: string, enabled: boolean) => Promise<void>;
}

function ShareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
    </svg>
  );
}

const noSubscribe = () => () => {};

/**
 * A single "Share" button that opens a popover for the trip's link sharing: a visibility choice
 * (restricted or anyone with the link) plus the link and a copy button. Still the one
 * enabled/disabled bit under the hood, through the same `setSharing` action.
 *
 * The panel uses the native Popover API, so it renders in the top layer: the ticket header it
 * sits in clips its overflow (for the punched notches), and an absolutely positioned panel got
 * cut off there. The browser also handles Escape and tapping outside.
 */
export function ShareTripToggle({
  tripId,
  shareToken,
  initialEnabled,
  setSharing,
}: ShareTripToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  // The full link needs window.location: empty on the server, the real origin once on the client.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const linkRef = useRef<HTMLInputElement>(null);
  const panelId = `share-${tripId}`;

  function handleVisibilityChange(next: boolean) {
    if (next === enabled) return;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setSharing(tripId, next);
      } catch {
        setEnabled(!next);
      }
    });
  }

  const shareUrl = `${origin}/shared/${shareToken}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("copied");
    } catch {
      // Clipboard blocked (permissions, insecure context): select the link so it can be copied by hand.
      linkRef.current?.select();
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={panelId}
        aria-haspopup="dialog"
        className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
          enabled
            ? "border-accent-400/40 bg-accent-400/15 text-accent-400"
            : "border-white/30 text-white/90 hover:bg-white/10"
        }`}
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>

      <div
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label="Share this trip"
        className="share-popover glass-card w-[min(20rem,calc(100vw-2rem))] p-4 text-white"
      >
          <p className="font-display mb-3 text-sm font-semibold">Share this trip</p>

          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition ${
                !enabled ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name={`sharing-${tripId}`}
                checked={!enabled}
                disabled={pending}
                onChange={() => handleVisibilityChange(false)}
                className="accent-accent-500 mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block font-medium text-white/90">Restricted</span>
                <span className="block text-xs text-white/75">Only you can view this trip.</span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition ${
                enabled ? "border-accent-400/40 bg-accent-400/15" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name={`sharing-${tripId}`}
                checked={enabled}
                disabled={pending}
                onChange={() => handleVisibilityChange(true)}
                className="accent-accent-500 mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block font-medium text-white/90">Anyone with the link</span>
                <span className="block text-xs text-white/75">Anyone with the link can view (read-only).</span>
              </span>
            </label>
          </div>

          {enabled && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3">
              <input
                type="text"
                readOnly
                ref={linkRef}
                value={shareUrl}
                aria-label="Share link"
                onFocus={(event) => event.currentTarget.select()}
                className="glass-input min-h-11 min-w-0 flex-1 px-2 font-mono text-xs text-white/80"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="press bg-accent-500 hover:bg-accent-400 text-ink-950 min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition"
              >
                {copied === "copied" ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <p role="status" className="mt-2 min-h-4 text-xs text-white/75">
            {copied === "copied" && "Link copied."}
            {copied === "failed" && "Couldn't copy automatically. The link is selected, so copy it from there."}
          </p>
      </div>
    </>
  );
}
