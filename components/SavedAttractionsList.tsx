"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allAttractions, formatBudget, type Attraction } from "@/lib/attractions";
import { readSavedAttractionIds, SAVED_ATTRACTIONS_KEY } from "@/lib/savedAttractions";
import { addAttractionToTrip } from "@/actions/trips";
import { RetryImage } from "@/components/RetryImage";
import { SubmitButton } from "@/components/SubmitButton";
import type { TripCardTrip } from "@/components/TripCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

interface SavedAttractionsListProps {
  /** The signed-in user's upcoming trips, for the "add to trip" picker on each card — empty when signed out or with no upcoming trips. */
  trips: TripCardTrip[];
}

export function SavedAttractionsList({ trips }: SavedAttractionsListProps) {
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

  const saved: Attraction[] | null = savedIds
    ? allAttractions().filter((a) => savedIds.has(a.id))
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Saved"
        meta={
          saved && saved.length > 0
            ? `${saved.length} ${saved.length === 1 ? "place" : "places"} on your shortlist. Add one to a trip, or plan a new trip around it.`
            : "Your shortlist of places to go, kept on this device."
        }
      />

      {saved === null ? (
        // localStorage is only readable after mount; hold the layout with
        // card-shaped placeholders instead of rendering nothing.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="status" aria-label="Loading saved places">
          {[0, 1].map((i) => (
            <div key={i} className="glass-card flex flex-col overflow-hidden">
              <div className="skeleton h-32 w-full !rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <span className="skeleton h-4 w-1/2" />
                <span className="skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : saved.length === 0 ? (
        <EmptyState
          code="♡"
          title="Nothing saved yet"
          body="Tap Add to Trip on any attraction card and it lands here, ready to drop into a trip or plan a new one around."
          actions={[{ href: "/trips", label: "Browse attractions", primary: true }]}
        />
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
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  {trips.length > 0 && (
                    <form
                      action={addAttractionToTrip}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="hidden"
                        name="city"
                        value={`${attraction.city}, ${attraction.country}`}
                      />
                      <input type="hidden" name="notes" value={attraction.name} />
                      <select
                        name="trip_id"
                        required
                        aria-label={`Add ${attraction.name} to trip`}
                        className="glass-input min-w-0 flex-1 px-2 py-1 text-xs"
                      >
                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.name}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        variant="ghost"
                        pendingLabel="Adding…"
                        className="shrink-0 px-2 py-1 text-xs"
                      >
                        Add to trip
                      </SubmitButton>
                    </form>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/trips/plan?destination=${encodeURIComponent(`${attraction.city}, ${attraction.country}`)}`}
                      className="text-accent-400 -ml-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      Plan a new trip here
                    </Link>
                    <button
                      type="button"
                      onClick={() => unsave(attraction.id)}
                      aria-label={`Remove ${attraction.name} from saved`}
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
