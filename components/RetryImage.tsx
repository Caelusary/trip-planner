"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

/**
 * Wraps next/image with automatic retry-on-error, backing off exponentially
 * (1.5s, 3s, 6s, 12s). Wikimedia — this app's only external image host —
 * rate-limits aggressively under burst load: CarouselStack.tsx and
 * AttractionMorphView.tsx both eager-load several images at once (a
 * deliberate earlier fix — `loading="lazy"` never actually triggered for
 * peek/activity images in this app, verified live), so a 429 here is
 * common and usually resolves itself a few seconds later, not a
 * permanently missing image. Retrying automatically avoids showing a
 * broken-image icon for something that's really just rate-limited.
 */
export function RetryImage({ src, alt, onError, ...rest }: ImageProps) {
  const [attempt, setAttempt] = useState(0);

  function handleError(event: React.SyntheticEvent<HTMLImageElement, Event>) {
    if (attempt < MAX_RETRIES) {
      window.setTimeout(() => setAttempt((current) => current + 1), BASE_DELAY_MS * 2 ** attempt);
    }
    onError?.(event);
  }

  // Appends a cache-busting query param once retrying — Next's image
  // optimizer caches by its own `/_next/image?url=...` proxy URL, so
  // replaying the exact same `src` after a 429 would just hit that same
  // cached error instead of making a fresh upstream attempt.
  const effectiveSrc =
    attempt === 0 || typeof src !== "string"
      ? src
      : `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;

  return <Image key={attempt} src={effectiveSrc} alt={alt} onError={handleError} {...rest} />;
}
