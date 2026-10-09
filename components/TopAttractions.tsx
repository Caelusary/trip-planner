"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attractionsFor,
  COUNTRY_LIST,
  COUNTRY_NAMES,
  type AttractionCategory,
  type CountryCode,
} from "@/lib/attractions";
import { useUserCountry } from "@/lib/useUserCountry";
import { SAVED_ATTRACTIONS_KEY } from "@/lib/savedAttractions";
import { CarouselStack, type CarouselItem } from "@/components/CarouselStack";
import { BudgetFilter } from "@/components/BudgetFilter";
import { CategoryFilter } from "@/components/CategoryFilter";

interface BudgetRangeUSD {
  min: number;
  max: number;
}

export function TopAttractions() {
  const {
    country: detectedCountry,
    detecting,
    supported: geolocationSupported,
    error: detectError,
    detect,
  } = useUserCountry();
  // Once the user picks a country from the dropdown it sticks, overriding
  // whatever geolocation resolves to (or already resolved to). Until then,
  // the carousel tracks the detected country live.
  const [manualCountry, setManualCountry] = useState<CountryCode | null>(null);
  const country = manualCountry ?? detectedCountry;

  function handleDetectClick() {
    // "Use my location" should win over any earlier manual pick, so clear
    // it first — otherwise a resolved detection would silently be ignored.
    setManualCountry(null);
    detect();
  }

  const [category, setCategory] = useState<AttractionCategory | "All">("All");
  const [query, setQuery] = useState("");
  // A search typed for one country is almost never meant for the next one
  // picked — clear it on render during country change (same render-phase
  // pattern as datasetRangeUSD/valueUSD below) rather than in an effect, so
  // there's no one-frame flash of a stale query against the new country.
  const [syncedCountry, setSyncedCountry] = useState(country);
  if (syncedCountry !== country) {
    setSyncedCountry(country);
    setQuery("");
  }
  const allAttractionsUnfiltered = attractionsFor(country);
  // Memoized: `.filter()` below builds a new array every call, so without
  // this, `allAttractions` got a fresh reference on every render whenever a
  // specific category was selected (the `category === "All"` branch reused
  // `allAttractionsUnfiltered`'s already-stable reference, but the filtered
  // branch never did). `datasetRangeUSD`'s own useMemo depends on
  // `allAttractions`, so that never stabilized either — which fed straight
  // into the `syncedRangeUSD !== datasetRangeUSD` render-phase check below
  // always seeing two different objects and calling setValueUSD on every
  // single render. Verified live: this is what actually threw "Too many
  // re-renders" the instant a non-"All" category was picked.
  const allAttractions = useMemo(
    () =>
      category === "All"
        ? allAttractionsUnfiltered
        : allAttractionsUnfiltered.filter((a) => a.category === category),
    [allAttractionsUnfiltered, category],
  );

  const datasetRangeUSD: BudgetRangeUSD = useMemo(() => {
    // A category can have zero matches in the current country — Math.min/max
    // of an empty array is +/-Infinity, which would break the slider.
    if (allAttractions.length === 0) return { min: 0, max: 0 };
    const min = Math.min(...allAttractions.map((a) => a.budgetMin));
    const max = Math.max(...allAttractions.map((a) => a.budgetMax));
    return { min, max };
  }, [allAttractions]);

  // The committed budget filter, always in USD regardless of which currency
  // BudgetFilter is currently displaying — resets to the full dataset range
  // whenever the country (and therefore the dataset) changes. Comparing
  // during render rather than in an effect avoids a one-frame flash of the
  // previous country's budget bounds before the reset lands.
  const [valueUSD, setValueUSD] = useState<BudgetRangeUSD>(datasetRangeUSD);
  const [syncedRangeUSD, setSyncedRangeUSD] = useState(datasetRangeUSD);
  if (syncedRangeUSD !== datasetRangeUSD) {
    setSyncedRangeUSD(datasetRangeUSD);
    setValueUSD(datasetRangeUSD);
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Read any previously-saved "My Trip" selections after mount only — doing
  // this in the initializer would read localStorage during server-side
  // rendering (where it doesn't exist) and mismatch the client's first
  // render, which React would flag as a hydration error. This is exactly
  // the "read an external system once after mount" case an effect is for;
  // deriving it instead (e.g. useSyncExternalStore) would need its own
  // change-notification plumbing to stay in sync with the write effect
  // below, which is more moving parts than a one-time hydration read needs.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_ATTRACTIONS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSelectedIds(new Set(JSON.parse(raw)));
    } catch {
      // Corrupt or inaccessible storage — start from an empty trip list.
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_ATTRACTIONS_KEY, JSON.stringify([...selectedIds]));
    } catch {
      // Storage full/unavailable — selections still work for this session.
    }
  }, [selectedIds]);

  const items: CarouselItem[] = useMemo(() => {
    let filtered = allAttractions.filter(
      (a) => a.budgetMax >= valueUSD.min && a.budgetMin <= valueUSD.max,
    );
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (a) => a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q),
      );
    }
    // Highest-rated first — the deck's own order (not just the "Top N"
    // caption in CarouselStack.tsx) now reflects rating, so swiping/
    // clicking through actually visits destinations best-to-worst.
    filtered.sort((a, b) => b.rating - a.rating);
    // With no search typed, the deck defaults to the top 10 by rating —
    // typing a name/city search surfaces every match instead, even ones
    // outside that top 10.
    const capped = q ? filtered : filtered.slice(0, 10);
    return capped.map((a) => {
      const label = `${a.city}, ${a.country}`;
      return {
        ...a,
        href: `/trips/plan?destination=${encodeURIComponent(label)}`,
      };
    });
  }, [allAttractions, valueUSD, query]);

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex flex-col items-center gap-4">
      {/* Visually just says "Explore" (see the single row below) — the
          full "Explore {country}" text still exists for screen readers,
          as this section's real heading. */}
      <h2 className="sr-only">Explore {COUNTRY_NAMES[country]}</h2>

      {/* One row: icon, "Explore" label, country dropdown, location button
          — collapsed from two stacked rows (a heading row, then a separate
          dropdown+button row) into one, same max-w-xs width as the budget
          card below it so the two read as a matched pair. */}
      <div className="flex w-full max-w-xs items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-accent-400 h-5 w-5 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-1.8 4.7a1 1 0 0 1-.5.5L7.5 16.5l1.8-4.7a1 1 0 0 1 .5-.5z" />
        </svg>
        <span className="font-display shrink-0 text-sm font-semibold">Explore</span>
        <select
          value={country}
          onChange={(event) => setManualCountry(event.target.value as CountryCode)}
          className="glass-input relative z-10 min-w-0 flex-1 cursor-pointer px-3 py-2 text-sm pointer-events-auto"
          aria-label="Choose a country"
        >
          {COUNTRY_LIST.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>

        {geolocationSupported &&
          (detecting ? (
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center"
              aria-live="polite"
              aria-label="Detecting your location"
            >
              <span
                aria-hidden="true"
                className="border-accent-400 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
              />
            </span>
          ) : (
            <button
              type="button"
              onClick={handleDetectClick}
              aria-label="Use my location"
              title="Use my location"
              className="text-accent-400 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/30 transition hover:bg-white/10"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 21s7-7.58 7-12A7 7 0 0 0 5 9c0 4.42 7 12 7 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          ))}
      </div>

      {detectError && (
        <p role="alert" className="text-danger-300 w-full max-w-xs text-xs">
          {detectError}
        </p>
      )}

      <div className="glass-input flex w-full max-w-xs items-center gap-2 px-3 py-2 text-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-white/50"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search attractions in ${COUNTRY_NAMES[country]}`}
          aria-label={`Search attractions in ${COUNTRY_NAMES[country]}`}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-white/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="-my-2 -mr-3 flex h-11 w-11 shrink-0 items-center justify-center text-white/40 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      <CategoryFilter value={category} onChange={setCategory} />

      <BudgetFilter
        datasetRangeUSD={datasetRangeUSD}
        valueUSD={valueUSD}
        onChangeUSD={setValueUSD}
        matchCount={items.length}
        totalCount={allAttractions.length}
      />

      {items.length > 0 ? (
        <CarouselStack
          key={`${country}-${category}`}
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        <p className="glass-card w-full max-w-xs p-6 text-center text-sm text-white/70">
          {query
            ? `No attractions match "${query}". Try a different search, category, or budget.`
            : "No attractions match. Try a different category or a wider budget."}
        </p>
      )}
    </section>
  );
}
