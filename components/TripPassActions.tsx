"use client";

import { useState } from "react";

interface TripPassActionsProps {
  tripName: string;
  destinationCity: string;
}

/**
 * Print and share controls for the Trip Pass — kept out of the print
 * output itself via `print:hidden` on the wrapping element in the page.
 * Print-to-PDF (`window.print()`) needs no new dependency and every
 * browser's print dialog already offers "Save as PDF", so that alone
 * covers "downloadable" without a PDF-generation library. Share prefers
 * the native share sheet where available and falls back to a clipboard
 * copy (with an inline confirmation) everywhere else.
 */
export function TripPassActions({ tripName, destinationCity }: TripPassActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: `${tripName} — Trip Pass`,
      text: `My trip to ${destinationCity}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled the share sheet, or it failed — fall through to
        // clipboard so the button still does *something* useful.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied/unavailable — nothing more we can do silently.
    }
  }

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-400"
      >
        Print / Save as PDF
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
      >
        {copied ? "Link copied!" : "Share"}
      </button>
    </div>
  );
}
