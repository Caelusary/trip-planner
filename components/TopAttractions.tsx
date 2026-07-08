"use client";

import { useMemo, useState } from "react";
import { attractionsFor, COUNTRY_NAMES, type BudgetTier } from "@/lib/attractions";
import { useUserCountry } from "@/lib/useUserCountry";
import { CarouselStack, type CarouselItem } from "@/components/CarouselStack";

type BudgetFilter = "all" | BudgetTier;

const BUDGET_OPTIONS: { value: BudgetFilter; label: string }[] = [
  { value: "all", label: "All budgets" },
  { value: "$", label: "$ — budget" },
  { value: "$$", label: "$$ — moderate" },
  { value: "$$$", label: "$$$ — splurge" },
];

export function TopAttractions() {
  const { country, detecting } = useUserCountry();
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const items: CarouselItem[] = useMemo(() => {
    const attractions = attractionsFor(country).filter(
      (a) => budgetFilter === "all" || a.budgetTier === budgetFilter,
    );
    return attractions.map((a) => {
      const label = `${a.city}, ${a.country}`;
      return {
        id: a.id,
        name: a.name,
        city: a.city,
        country: a.country,
        image: a.image,
        description: a.description,
        rating: a.rating,
        budgetTier: a.budgetTier,
        budgetLabel: a.budgetLabel,
        bestTime: a.bestTime,
        highlights: a.highlights,
        funFact: a.funFact,
        href: `/trips?destination=${encodeURIComponent(label)}#plan-trip`,
      };
    });
  }, [country, budgetFilter]);

  function toggleFollow(id: string) {
    setFollowedIds((current) => {
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
        {detecting && (
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
        value={budgetFilter}
        onChange={(event) => setBudgetFilter(event.target.value as BudgetFilter)}
        className="glass-input relative z-10 w-full max-w-xs cursor-pointer px-3 py-2 text-sm pointer-events-auto"
        aria-label="Filter by budget"
      >
        {BUDGET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {items.length > 0 ? (
        <CarouselStack
          key={`${country}-${budgetFilter}`}
          items={items}
          followedIds={followedIds}
          onToggleFollow={toggleFollow}
        />
      ) : (
        <p className="glass-card w-full max-w-xs p-6 text-center text-sm text-white/70">
          No attractions match that budget — try a different filter.
        </p>
      )}
    </section>
  );
}
