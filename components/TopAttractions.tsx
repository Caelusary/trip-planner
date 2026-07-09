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
  const { country: detectedCountry, detecting } = useUserCountry();
  // Once the user picks a country from the dropdown it sticks, overriding
  // whatever geolocation resolves to (or already resolved to). Until then,
  // the carousel tracks the detected country live.
  const [manualCountry, setManualCountry] = useState<CountryCode | null>(null);
  const country = manualCountry ?? detectedCountry;

  const allAttractions = attractionsFor(country);

  const datasetRangeUSD: BudgetRangeUSD = useMemo(() => {
    const min = Math.min(...allAttractions.map((a) => a.budgetMin));
    const max = Math.max(...allAttractions.map((a) => a.budgetMax));
    return { min, max };
  }, [allAttractions]);

  // The committed budget filter, always in USD regardless of which currency
  // BudgetFilter is currently displaying — resets to the full dataset range
  // whenever the country (and therefore the dataset) changes.
  const [valueUSD, setValueUSD] = useState<BudgetRangeUSD>(datasetRangeUSD);
  useEffect(() => {
    setValueUSD(datasetRangeUSD);
  }, [datasetRangeUSD]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Read any previously-saved "My Trip" selections after mount only — doing
  // this in the initializer would read localStorage during server-side
  // rendering (where it doesn't exist) and mismatch the client's first
  // render, which React would flag as a hydration error.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TRIP_STORAGE_KEY);
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
        id: a.id,
        name: a.name,
        city: a.city,
        country: a.country,
        image: a.image,
        description: a.description,
        rating: a.rating,
        budgetMin: a.budgetMin,
        budgetMax: a.budgetMax,
        bestTime: a.bestTime,
        activities: a.activities,
        funFact: a.funFact,
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
      <div className="flex w-full max-w-xs items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          Top Attractions in {COUNTRY_NAMES[country]}
        </h2>
        {manualCountry === null && detecting && (
          <span
            className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/50"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400"
            />
            Detecting…
          </span>
        )}
      </div>

      <select
        value={country}
        onChange={(event) => setManualCountry(event.target.value as CountryCode)}
        className="glass-input relative z-10 w-full max-w-xs cursor-pointer px-3 py-2 text-sm pointer-events-auto"
        aria-label="Choose a country"
      >
        {COUNTRY_LIST.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>

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
