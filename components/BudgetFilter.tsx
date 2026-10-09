"use client";

import { useId, useState } from "react";
import { CURRENCIES, currencySymbol, fromUSD, toUSD, type CurrencyCode } from "@/lib/currency";
import { useLiveExchangeRates } from "@/lib/useLiveExchangeRates";

interface BudgetRangeUSD {
  min: number;
  max: number;
}

interface BudgetFilterProps {
  /** The full min–max span across the current attraction set, in USD — used only as the "reset" target when the field is cleared. */
  datasetRangeUSD: BudgetRangeUSD;
  /** The committed filter range, in USD — the single source of truth. `min` is always 0 (see below); only `max` is ever user-controlled. */
  valueUSD: BudgetRangeUSD;
  onChangeUSD: (range: BudgetRangeUSD) => void;
  matchCount: number;
  totalCount: number;
}

// The slider's track is a plain linear 0–100,000 scale in whichever
// currency is currently selected — switching currency doesn't rescale or
// convert the cap, it just relabels it, so "100,000" always reads as a flat
// round number no matter the currency.
const SLIDER_MAX_DISPLAY = 100_000;

// Quick-select ceilings (in USD) — each sets the max to this amount (min is
// always 0), covering the common "free" through "luxury" bands in one tap
// instead of dragging the slider.
const PRESET_MAX_USD = [0, 500, 5_000, 25_000, 100_000];

/**
 * Budget filter with a single "up to" slider + Max text input + currency
 * picker. There's no minimum thumb — verified with the user that a second
 * thumb for a non-zero minimum wasn't something almost anyone actually
 * wanted (a vacation budget "floor" isn't a thing most travelers filter
 * by), so min is now a hardcoded 0 rather than a second draggable value.
 * `onChangeUSD` still takes `{min, max}` (unchanged prop shape, so the
 * parent's filtering logic didn't need to change) — every call from in here
 * just always sends `min: 0`.
 */
export function BudgetFilter({
  datasetRangeUSD,
  valueUSD,
  onChangeUSD,
  matchCount,
  totalCount,
}: BudgetFilterProps) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  // Live rates load asynchronously and silently fall back to lib/currency.ts's
  // static table until they do (or if the fetch fails) — every fromUSD/toUSD
  // call below passes this through for that reason.
  const liveRates = useLiveExchangeRates();
  const [maxText, setMaxText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const maxId = useId();

  const [isEditingMax, setIsEditingMax] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const sliderMaxDisplay = Math.round(fromUSD(valueUSD.max, currency, liveRates ?? undefined));
  const posMax = Math.min(Math.max(sliderMaxDisplay, 0), SLIDER_MAX_DISPLAY);

  // Sync the text field to external changes. Adjusted during render (React's
  // recommended pattern for state derived from props) rather than in a
  // useEffect, so the new text appears in the same commit instead of one
  // frame later.
  const [syncedMax, setSyncedMax] = useState(sliderMaxDisplay);
  if (!isEditingMax && syncedMax !== sliderMaxDisplay) {
    setSyncedMax(sliderMaxDisplay);
    setMaxText(String(sliderMaxDisplay));
    setError(null);
  }

  function commitMaxUSD(nextMaxUSD: number) {
    if (nextMaxUSD < 0) {
      setError("Budget can't be negative.");
      return;
    }
    setError(null);
    onChangeUSD({ min: 0, max: nextMaxUSD });
  }

  function handleText(raw: string) {
    setMaxText(raw);
    const trim = raw.trim();

    if (trim === "") {
      setError(null);
      onChangeUSD({ min: 0, max: datasetRangeUSD.max });
      // Set directly rather than relying on the sync above: if the reset
      // value happens to numerically equal the value already applied, the
      // sync never fires (nothing changed), leaving the field stuck blank
      // instead of showing the restored default number.
      setMaxText(String(Math.round(fromUSD(datasetRangeUSD.max, currency, liveRates ?? undefined))));
      return;
    }

    const next = Number(trim);
    if (!Number.isFinite(next)) {
      setError("Enter a valid number.");
      return;
    }
    commitMaxUSD(toUSD(next, currency, liveRates ?? undefined));
  }

  // Slider input values are the amount directly, in the currently selected
  // display currency (0–100,000) — converted to USD only at the point of
  // commit, since that's the single source of truth `onChangeUSD` expects.
  function handleSlider(rawDisplayValue: number) {
    setIsDragging(true);
    commitMaxUSD(toUSD(rawDisplayValue, currency, liveRates ?? undefined));
  }

  const handleDragEnd = () => setIsDragging(false);

  const fillRightPct = (posMax / SLIDER_MAX_DISPLAY) * 100;
  const symbol = currencySymbol(currency);

  const formatValue = (usd: number) => {
    return `${symbol}${Math.round(fromUSD(usd, currency, liveRates ?? undefined)).toLocaleString()}`;
  };

  return (
    <div className="glass-card flex w-full max-w-xs flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">Budget</p>
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
          className="glass-input cursor-pointer px-2 py-1 text-xs"
          aria-label="Currency"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.symbol}
            </option>
          ))}
        </select>
      </div>

      <div
        className="range-slider relative h-6 w-full touch-none select-none"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('input[type="range"]')) {
            document.body.style.userSelect = "none";
          }
        }}
        onMouseUp={() => {
          document.body.style.userSelect = "";
        }}
      >
        <div className="range-track absolute top-1/2 w-full -translate-y-1/2" />
        {/* Fill always starts at the track's left edge (min is a constant
            0, not a second thumb) and runs to wherever the max thumb is. */}
        <div
          className="range-fill absolute top-1/2 left-0 -translate-y-1/2 transition-all duration-150 ease-out"
          style={{ right: `${100 - fillRightPct}%` }}
        />

        <input
          type="range"
          min={0}
          max={SLIDER_MAX_DISPLAY}
          value={posMax}
          onChange={(event) => handleSlider(Number(event.target.value))}
          onMouseUp={handleDragEnd}
          onTouchEnd={handleDragEnd}
          aria-label="Budget up to"
          step={100}
          className="absolute top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-accent-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&:active::-webkit-slider-thumb]:cursor-grabbing [&:active::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent-500 [&::-moz-range-thumb]:shadow-md"
        />
        {isDragging && (
          <div
            className="absolute -top-8 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs whitespace-nowrap text-white/90 backdrop-blur-sm"
            style={{ left: `${fillRightPct}%`, pointerEvents: "none" }}
          >
            {formatValue(valueUSD.max)}
          </div>
        )}
      </div>

      <label htmlFor={maxId} className="flex flex-col gap-1 text-[11px] text-white/60">
        Up to
        <div className="glass-input flex items-center gap-1 px-3 py-2 text-sm">
          <span className="text-white/50" aria-hidden="true">
            {symbol}
          </span>
          <input
            id={maxId}
            type="number"
            inputMode="numeric"
            min={0}
            value={maxText}
            onChange={(event) => handleText(event.target.value)}
            onFocus={() => setIsEditingMax(true)}
            onBlur={() => {
              setIsEditingMax(false);
              if (maxText.trim() !== "") {
                const val = Number(maxText);
                if (!isNaN(val) && val >= 0) {
                  commitMaxUSD(toUSD(val, currency, liveRates ?? undefined));
                }
              }
            }}
            className="w-full min-w-0 bg-transparent outline-none"
            aria-invalid={error != null}
          />
        </div>
      </label>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_MAX_USD.map((presetUSD) => {
          const isActive = valueUSD.max === presetUSD;
          return (
            <button
              key={presetUSD}
              type="button"
              onClick={() => commitMaxUSD(presetUSD)}
              aria-pressed={isActive}
              className={`min-h-11 min-w-11 rounded-full border px-3 text-xs font-medium transition-colors ${
                isActive
                  ? "border-accent-400/40 bg-accent-400/15 text-accent-400"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {formatValue(presetUSD)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        {error ? (
          <p className="text-danger-300" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-white/50">
            Showing {matchCount} of {totalCount}
          </p>
        )}
        {currency !== "USD" && <p className="shrink-0 text-white/50">base: USD</p>}
      </div>
    </div>
  );
}
