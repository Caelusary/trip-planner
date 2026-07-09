"use client";

import { useEffect, useId, useState } from "react";
import { CURRENCIES, currencySymbol, fromUSD, toUSD, type CurrencyCode } from "@/lib/currency";

interface BudgetRangeUSD {
  min: number;
  max: number;
}

interface BudgetFilterProps {
  /** The full min–max span across the current attraction set, in USD — used only as the "reset" target when both fields are cleared. */
  datasetRangeUSD: BudgetRangeUSD;
  /** The committed filter range, in USD — the single source of truth. */
  valueUSD: BudgetRangeUSD;
  onChangeUSD: (range: BudgetRangeUSD) => void;
  matchCount: number;
  totalCount: number;
}

// The slider's track always spans a fixed $0–$100,000 in USD, regardless of
// what the current country's attractions actually cost — that's the whole
// point of a filter this wide, it lets someone search into the luxury range
// even if nothing in view costs that much yet. To keep the track compact
// (it doesn't get physically longer to cover $100k) while still giving fine
// control over everyday budgets, position along the track is non-linear:
// the first half covers $0–$10,000 and the second half covers the much
// wider $10,000–$100,000 span. `position` below is that 0–1000 slider-input
// domain; `usd` is the real dollar amount it maps to.
const POSITION_MAX = 1000;
const POSITION_MID = 500;
const VALUE_MID_USD = 10_000;
const VALUE_MAX_USD = 100_000;

function usdToPosition(usd: number): number {
  const v = Math.min(Math.max(usd, 0), VALUE_MAX_USD);
  if (v <= VALUE_MID_USD) return (v / VALUE_MID_USD) * POSITION_MID;
  return POSITION_MID + ((v - VALUE_MID_USD) / (VALUE_MAX_USD - VALUE_MID_USD)) * (POSITION_MAX - POSITION_MID);
}

function positionToUsd(position: number): number {
  const p = Math.min(Math.max(position, 0), POSITION_MAX);
  if (p <= POSITION_MID) return (p / POSITION_MID) * VALUE_MID_USD;
  return VALUE_MID_USD + ((p - POSITION_MID) / (POSITION_MAX - POSITION_MID)) * (VALUE_MAX_USD - VALUE_MID_USD);
}

/**
 * Budget filter with a synced dual-thumb slider + Min/Max text inputs and a
 * currency picker. USD stays the source of truth throughout — the slider
 * position, the fixed $100k track bounds, and both text fields are all just
 * that USD range converted for display, so switching currencies re-labels
 * the same underlying selection instead of resetting it.
 */
export function BudgetFilter({
  datasetRangeUSD,
  valueUSD,
  onChangeUSD,
  matchCount,
  totalCount,
}: BudgetFilterProps) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const minId = useId();
  const maxId = useId();

  // Fixed track ceiling, converted to the display currency — used only as
  // the fallback when a text field is left blank (a blank Max means "no
  // upper limit up to the $100k ceiling," not "no filter at all").
  const trackBoundsMax = Math.round(fromUSD(VALUE_MAX_USD, currency));

  const posMin = usdToPosition(valueUSD.min);
  const posMax = usdToPosition(valueUSD.max);
  const sliderMinDisplay = Math.round(fromUSD(valueUSD.min, currency));
  const sliderMaxDisplay = Math.round(fromUSD(valueUSD.max, currency));

  // Mirrors the text inputs to the committed range whenever it moves for a
  // reason OTHER than typing in these fields — a slider drag, a currency
  // switch, or the dataset itself changing (new country). A successful
  // commit from typing round-trips back to the same number, so this never
  // fights the user mid-keystroke; it only ever corrects the display after
  // an external change or snaps back after an invalid entry is abandoned.
  useEffect(() => {
    setMinText(String(sliderMinDisplay));
    setMaxText(String(sliderMaxDisplay));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderMinDisplay, sliderMaxDisplay, currency]);

  function commitUSD(nextMinUSD: number, nextMaxUSD: number) {
    if (nextMinUSD < 0 || nextMaxUSD < 0) {
      setError("Budget can't be negative.");
      return;
    }
    if (nextMinUSD > nextMaxUSD) {
      setError("Minimum can't be greater than maximum.");
      return;
    }
    setError(null);
    onChangeUSD({ min: nextMinUSD, max: nextMaxUSD });
  }

  function handleText(which: "min" | "max", raw: string) {
    if (which === "min") setMinText(raw);
    else setMaxText(raw);

    const minRaw = which === "min" ? raw : minText;
    const maxRaw = which === "max" ? raw : maxText;
    const minTrim = minRaw.trim();
    const maxTrim = maxRaw.trim();

    if (minTrim === "" && maxTrim === "") {
      setError(null);
      onChangeUSD(datasetRangeUSD);
      // Set directly rather than relying on the mirror effect: if the reset
      // range happens to numerically equal the range already applied, the
      // effect never fires (nothing changed), leaving the fields stuck
      // blank instead of showing the restored default numbers.
      setMinText(String(Math.round(fromUSD(datasetRangeUSD.min, currency))));
      setMaxText(String(Math.round(fromUSD(datasetRangeUSD.max, currency))));
      return;
    }

    const nextMin = minTrim === "" ? 0 : Number(minTrim);
    const nextMax = maxTrim === "" ? trackBoundsMax : Number(maxTrim);
    if (!Number.isFinite(nextMin) || !Number.isFinite(nextMax)) {
      setError("Enter a valid number.");
      return;
    }
    commitUSD(toUSD(nextMin, currency), toUSD(nextMax, currency));
  }

  // Dragging a thumb past its counterpart clamps to it rather than crossing
  // over, so "min" and "max" can never silently swap roles. Slider input
  // values are always in position-space (0–1000), converted straight to USD
  // — no currency round-trip needed since the track itself is USD-native.
  function handleSlider(which: "min" | "max", rawPosition: number) {
    const usd = positionToUsd(rawPosition);
    if (which === "min") commitUSD(Math.min(usd, valueUSD.max), valueUSD.max);
    else commitUSD(valueUSD.min, Math.max(usd, valueUSD.min));
  }

  const fillLeftPct = (posMin / POSITION_MAX) * 100;
  const fillRightPct = (posMax / POSITION_MAX) * 100;
  // Whichever thumb is closer to the right edge normally sits on top so it
  // stays grabbable; but once the two thumbs are within reach of each other
  // near the top of the range, the min thumb needs priority or it becomes
  // unreachable underneath max.
  const minOnTop = posMin > POSITION_MAX * 0.5;
  const symbol = currencySymbol(currency);

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

      <div className="range-slider">
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${fillLeftPct}%`, right: `${100 - fillRightPct}%` }} />
        <input
          type="range"
          min={0}
          max={POSITION_MAX}
          value={posMin}
          onChange={(event) => handleSlider("min", Number(event.target.value))}
          style={{ zIndex: minOnTop ? 5 : 3 }}
          aria-label="Minimum budget"
        />
        <input
          type="range"
          min={0}
          max={POSITION_MAX}
          value={posMax}
          onChange={(event) => handleSlider("max", Number(event.target.value))}
          style={{ zIndex: minOnTop ? 3 : 5 }}
          aria-label="Maximum budget"
        />
      </div>
      <div className="-mt-1 flex justify-between text-[9px] text-white/30">
        <span>{symbol}0</span>
        <span>{symbol}{Math.round(fromUSD(VALUE_MID_USD, currency)).toLocaleString()}</span>
        <span>{symbol}{trackBoundsMax.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={minId} className="flex flex-1 flex-col gap-1 text-[11px] text-white/60">
          Min
          <div className="glass-input flex items-center gap-1 px-3 py-2 text-sm">
            <span className="text-white/50" aria-hidden="true">
              {symbol}
            </span>
            <input
              id={minId}
              type="number"
              inputMode="numeric"
              min={0}
              value={minText}
              onChange={(event) => handleText("min", event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none"
              aria-invalid={error != null}
            />
          </div>
        </label>
        <span className="mt-4 shrink-0 text-white/30">–</span>
        <label htmlFor={maxId} className="flex flex-1 flex-col gap-1 text-[11px] text-white/60">
          Max
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
              onChange={(event) => handleText("max", event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none"
              aria-invalid={error != null}
            />
          </div>
        </label>
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
        {currency !== "USD" && <p className="shrink-0 text-white/30">base: USD</p>}
      </div>
    </div>
  );
}
