"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allAttractions, formatBudget, type Attraction } from "@/lib/attractions";
import { readSavedAttractionIds, SAVED_ATTRACTIONS_KEY } from "@/lib/savedAttractions";
import { RetryImage } from "@/components/RetryImage";

export default function SavedPage() {
  // Saved attractions live only in localStorage (see TopAttractions.tsx),
  // so — same hydration-mismatch reasoning as that component — this reads
  // after mount rather than in the initializer.
  const [savedIds, setSavedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds(new Set(readSavedAttractionIds()));
  }, []);

  function unsave(id: string) {
    setSavedIds((current) => {
      if (!current) return current;
      const next = new Set(current);
      next.delete(id);
      try {
        window.localStorage.setItem(SAVED_ATTRACTIONS_KEY, JSON.stringify([...next]));
      } catch {
        // Storage full/unavailable — the in-memory list still updates for this session.
      }
      return next;
    });
  }

  if (savedIds === null) {
    return null;
  }

  const saved: Attraction[] = allAttractions().filter((a) => savedIds.has(a.id));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-4">
      <h1 className="font-display text-xl font-semibold">Saved</h1>

      {saved.length === 0 ? (
        <p className="glass-card p-6 text-center text-sm text-white/70">
          Nothing saved yet — tap &ldquo;Add to Trip&rdquo; on any destination to save it here.
        </p>
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
          {saved.map((attraction) => (
            <div key={attraction.id} className="glass-card flex flex-col overflow-hidden">
              <div className="relative h-32 w-full shrink-0">
                <RetryImage
                  src={attraction.image}
                  alt={attraction.name}
                  fill
                  sizes="(min-width: 640px) 336px, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="font-display text-base font-semibold text-white">{attraction.name}</p>
                <p className="text-accent-400/90 text-xs font-medium">
                  @{attraction.city}, {attraction.country}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                    {formatBudget(attraction.budgetMin, attraction.budgetMax)}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
                    {attraction.bestTime}
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Link
                    href={`/trips/plan?destination=${encodeURIComponent(`${attraction.city}, ${attraction.country}`)}`}
                    className="text-accent-400 text-xs font-semibold underline-offset-2 hover:underline"
                  >
                    Plan a trip here
                  </Link>
                  <button
                    type="button"
                    onClick={() => unsave(attraction.id)}
                    aria-label={`Remove ${attraction.name} from saved`}
                    className="rounded-md px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
