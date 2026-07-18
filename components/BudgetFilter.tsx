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

// The slider's track always spans a fixed $0–$100,000 in USD, regardless of
// what the current country's attractions actually cost — that's the whole
// point of a filter this wide, it lets someone search into the luxury range
// even if nothing in view costs that much yet. To keep fine control over
// everyday budgets despite that huge range, position along the track is a
// logarithmic (not linear) function of USD — the standard approach for a
// wide-range price slider (the same idea behind Airbnb-style price filters,
// audio volume, camera aperture, etc.): each pixel of drag changes the
// value by roughly the same *percentage* everywhere on the track, so
// there's naturally lots of room for small-dollar precision near the low
// end without needing the range to stop being useful at the high end.
// `position` below is the 0–1000 slider-input domain; `usd` is the real
// dollar amount it maps to.
const POSITION_MAX = 1000;
const VALUE_MAX_USD = 100_000;
// log(usd + 1), not log(usd): log(0) is -Infinity, undefined for a slider
// that needs to reach all the way down to $0.
const LOG_MAX = Math.log(VALUE_MAX_USD + 1);

// Quick-select ceilings — each sets the max to this amount (min is always
// 0), covering the common "free" through "luxury" bands in one tap instead
// of dragging the slider.
const PRESET_MAX_USD = [0, 500, 5_000, 25_000, 100_000];

// Track tick marks show all 5 of the above (see the track itself), but only
// this subset gets a text label under it — on this card's narrow width, the
// log scale bunches $25,000 and $100,000's true positions close enough
// together (88% and 100% of the track) that both labels rendered on top of
// each other. $25,000 still gets a tick, just no text.
const TICK_LABEL_USD = [0, 500, 5_000, 100_000];

function usdToPosition(usd: number): number {
  const v = Math.min(Math.max(usd, 0), VALUE_MAX_USD);
  return (Math.log(v + 1) / LOG_MAX) * POSITION_MAX;
}

function positionToUsd(position: number): number {
  const p = Math.min(Math.max(position, 0), POSITION_MAX);
  return Math.exp((p / POSITION_MAX) * LOG_MAX) - 1;
}

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

  const posMax = usdToPosition(valueUSD.max);
  const sliderMaxDisplay = Math.round(fromUSD(valueUSD.max, currency, liveRates ?? undefined));

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

  // Slider input values are always in position-space (0–1000), converted
  // straight to USD — no currency round-trip needed since the track itself
  // is USD-native.
  function handleSlider(rawPosition: number) {
    setIsDragging(true);
    commitMaxUSD(positionToUsd(rawPosition));
  }

  const handleDragEnd = () => setIsDragging(false);

  const fillRightPct = (posMax / POSITION_MAX) * 100;
  const symbol = currencySymbol(currency);

  const formatValue = (usd: number) => {
    return `${symbol}${Math.round(fromUSD(usd, currency, liveRates ?? undefined)).toLocaleString()}`;
  };

  // Compact form for the track's tick labels specifically (not the preset
  // buttons or the drag tooltip, which have room for the full number) — "K"
  // notation in the *display* currency, not just raw USD, since e.g. the
  // same $500 is well past 1000 once converted to JPY.
  const formatTick = (usd: number) => {
    const converted = Math.round(fromUSD(usd, currency, liveRates ?? undefined));
    if (converted >= 1000) return `${symbol}${Math.round(converted / 1000)}K`;
    return `${symbol}${converted}`;
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
        <div className="range-track absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
        {/* Fill always starts at the track's left edge (min is a constant
            0, not a second thumb) and runs to wherever the max thumb is. */}
        <div
          className="range-fill absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-150 ease-out"
          style={{ right: `${100 - fillRightPct}%` }}
        />

        {/* Tick marks embedded right on the track, at each preset's actual
            (log-scale) position — not a separate row of evenly-spaced text
            floating above the track that doesn't visually line up with
            where a drag actually lands. Dragging past one now means
            something: the thumb visibly passes through the mark. */}
        {PRESET_MAX_USD.map((tickUsd) => (
          <div
            key={tickUsd}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/30"
            style={{ left: `${(usdToPosition(tickUsd) / POSITION_MAX) * 100}%` }}
          />
        ))}

        <input
          type="range"
          min={0}
          max={POSITION_MAX}
          value={posMax}
          onChange={(event) => handleSlider(Number(event.target.value))}
          onMouseUp={handleDragEnd}
          onTouchEnd={handleDragEnd}
          aria-label="Budget up to"
          step={1}
          className="absolute top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-accent-500 [&::-webkit-slider-thumb]:to-accent-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&:active::-webkit-slider-thumb]:cursor-grabbing [&:active::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-accent-500 [&::-moz-range-thumb]:to-accent-400 [&::-moz-range-thumb]:shadow-lg"
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

      {/* Labels anchored under their own tick's true position (see the tick
          marks on the track above) — `justify-between` would space these
          evenly regardless of where their values actually fall on a log
          scale, which is exactly the mismatch the ticks fix. The two ends
          anchor to the track's own edges instead of being centered on a
          position that's already at 0%/100% (centering there would push
          half the text off the track). */}
      <div className="relative h-3 w-full text-[10px] text-white/50">
        {TICK_LABEL_USD.map((tickUsd) => {
          const pct = (usdToPosition(tickUsd) / POSITION_MAX) * 100;
          return (
            <span
              key={tickUsd}
              className={`absolute top-0 whitespace-nowrap ${
                pct < 1 ? "left-0" : pct > 99 ? "right-0" : "-translate-x-1/2"
              }`}
              style={pct >= 1 && pct <= 99 ? { left: `${pct}%` } : undefined}
            >
              {formatTick(tickUsd)}
            </span>
          );
        })}
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
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
