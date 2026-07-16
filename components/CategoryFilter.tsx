"use client";

import { ATTRACTION_CATEGORIES, type AttractionCategory } from "@/lib/attractions";

interface CategoryFilterProps {
  value: AttractionCategory | "All";
  onChange: (category: AttractionCategory | "All") => void;
}

/** Pill-shaped single-select category filter, sitting above the carousel. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const options: (AttractionCategory | "All")[] = ["All", ...ATTRACTION_CATEGORIES];

  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`min-h-9 rounded-full px-4 text-sm font-medium transition ${
              active
                ? "bg-accent-500 text-ink-950"
                : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
