"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attractionsFor,
  COUNTRY_LIST,
  COUNTRY_NAMES,
  type CountryCode,
} from "@/lib/attractions";
import { useUserCountry } from "@/lib/useUserCountry";
import { CarouselStack, type CarouselItem } from "@/components/CarouselStack";
import { BudgetFilter } from "@/components/BudgetFilter";

const TRIP_STORAGE_KEY = "trip-planner:selected-attractions";

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

  const allAttractions = attractionsFor(country);

  const datasetRangeUSD: BudgetRangeUSD = useMemo(() => {
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
      const raw = window.localStorage.getItem(TRIP_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSelectedIds(new Set(JSON.parse(raw)));
    } catch {
      // Corrupt or inaccessible storage — start from an empty trip list.
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify([...selectedIds]));
    } catch {
      // Storage full/unavailable — selections still work for this session.
    }
  }, [selectedIds]);

  const items: CarouselItem[] = useMemo(() => {
    const filtered = allAttractions.filter(
      (a) => a.budgetMax >= valueUSD.min && a.budgetMin <= valueUSD.max,
    );
    return filtered.map((a) => {
      const label = `${a.city}, ${a.country}`;
      return {
        ...a,
        href: `/trips?destination=${encodeURIComponent(label)}#plan-trip`,
      };
    });
  }, [allAttractions, valueUSD]);

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
      <h2 className="font-display w-full max-w-xs text-lg font-semibold">
        Top Attractions in {COUNTRY_NAMES[country]}
      </h2>

      <div className="flex w-full max-w-xs items-center gap-2">
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

      <BudgetFilter
        datasetRangeUSD={datasetRangeUSD}
        valueUSD={valueUSD}
        onChangeUSD={setValueUSD}
        matchCount={items.length}
        totalCount={allAttractions.length}
      />

      {items.length > 0 ? (
        <CarouselStack
          key={country}
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        <p className="glass-card w-full max-w-xs p-6 text-center text-sm text-white/70">
          No attractions match that budget — try a wider range.
        </p>
      )}
    </section>
  );
}
