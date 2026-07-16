"use client";

import { useId, useState } from "react";
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

  // Track editing state
  const [isEditingMin, setIsEditingMin] = useState(false);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);

  // Fixed track ceiling, converted to the display currency — used only as
  // the fallback when a text field is left blank (a blank Max means "no
  // upper limit up to the $100k ceiling," not "no filter at all").
  const trackBoundsMax = Math.round(fromUSD(VALUE_MAX_USD, currency));

  const posMin = usdToPosition(valueUSD.min);
  const posMax = usdToPosition(valueUSD.max);
  const sliderMinDisplay = Math.round(fromUSD(valueUSD.min, currency));
  const sliderMaxDisplay = Math.round(fromUSD(valueUSD.max, currency));

  // Sync text fields to external changes. Adjusted during render (React's
  // recommended pattern for state derived from props) rather than in a
  // useEffect, so the new text appears in the same commit instead of one
  // frame later.
  const [syncedDisplay, setSyncedDisplay] = useState({ min: sliderMinDisplay, max: sliderMaxDisplay });
  if (
      !isEditingMin &&
      !isEditingMax &&
      (syncedDisplay.min !== sliderMinDisplay || syncedDisplay.max !== sliderMaxDisplay)
  ) {
    setSyncedDisplay({ min: sliderMinDisplay, max: sliderMaxDisplay });
    setMinText(String(sliderMinDisplay));
    setMaxText(String(sliderMaxDisplay));
    setError(null);
  }

  // Check if thumbs are close to determine z-index
  const thumbsAreClose = Math.abs(posMax - posMin) < 20;
  const minOnTop = thumbsAreClose ? true : posMin > posMax;

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
      // Set directly rather than relying on the effect: if the reset
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
    setIsDragging(which);
    const usd = positionToUsd(rawPosition);
    if (which === "min") commitUSD(Math.min(usd, valueUSD.max), valueUSD.max);
    else commitUSD(valueUSD.min, Math.max(usd, valueUSD.min));
  }

  const handleDragEnd = () => setIsDragging(null);

  const fillLeftPct = (posMin / POSITION_MAX) * 100;
  const fillRightPct = (posMax / POSITION_MAX) * 100;
  const symbol = currencySymbol(currency);

  // Format value for display on thumbs
  const formatValue = (usd: number) => {
    return `${symbol}${Math.round(fromUSD(usd, currency)).toLocaleString()}`;
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
                document.body.style.userSelect = 'none';
              }
            }}
            onMouseUp={() => {
              document.body.style.userSelect = '';
            }}
        >
          <div className="range-track absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
          <div
              className="range-fill absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-150 ease-out"
              style={{
                left: `${fillLeftPct}%`,
                right: `${100 - fillRightPct}%`,
              }}
          />

          {/* Min Thumb with label */}
          <div className="relative h-full w-full">
            <input
                type="range"
                min={0}
                max={POSITION_MAX}
                value={posMin}
                onChange={(event) => handleSlider("min", Number(event.target.value))}
                onMouseUp={handleDragEnd}
                onTouchEnd={handleDragEnd}
                style={{ zIndex: minOnTop ? 5 : 3 }}
                aria-label="Minimum budget"
                step={1}
                className="absolute top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&:active::-webkit-slider-thumb]:cursor-grabbing [&:active::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-blue-500 [&::-moz-range-thumb]:to-purple-500 [&::-moz-range-thumb]:shadow-lg"
            />
            {isDragging === "min" && (
                <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs text-white/90 backdrop-blur-sm whitespace-nowrap"
                    style={{ pointerEvents: 'none' }}
                >
                  {formatValue(valueUSD.min)}
                </div>
            )}
          </div>

          {/* Max Thumb with label */}
          <div className="relative h-full w-full">
            <input
                type="range"
                min={0}
                max={POSITION_MAX}
                value={posMax}
                onChange={(event) => handleSlider("max", Number(event.target.value))}
                onMouseUp={handleDragEnd}
                onTouchEnd={handleDragEnd}
                style={{ zIndex: minOnTop ? 3 : 5 }}
                aria-label="Maximum budget"
                step={1}
                className="absolute top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&:active::-webkit-slider-thumb]:cursor-grabbing [&:active::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-blue-500 [&::-moz-range-thumb]:to-purple-500 [&::-moz-range-thumb]:shadow-lg"
            />
            {isDragging === "max" && (
                <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs text-white/90 backdrop-blur-sm whitespace-nowrap"
                    style={{ pointerEvents: 'none' }}
                >
                  {formatValue(valueUSD.max)}
                </div>
            )}
          </div>
        </div>

        <div className="-mt-1 flex justify-between text-[10px] text-white/50">
          <span>{symbol}0</span>
          <span>{symbol}{Math.round(fromUSD(500, currency)).toLocaleString()}</span>
          <span>{symbol}{Math.round(fromUSD(5000, currency)).toLocaleString()}</span>
          <span>{symbol}{Math.round(fromUSD(25000, currency)).toLocaleString()}</span>
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
                  onFocus={() => setIsEditingMin(true)}
                  onBlur={() => {
                    setIsEditingMin(false);
                    if (minText.trim() !== "") {
                      const val = Number(minText);
                      if (!isNaN(val) && val >= 0) {
                        commitUSD(toUSD(val, currency), valueUSD.max);
                      }
                    }
                  }}
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
                  onFocus={() => setIsEditingMax(true)}
                  onBlur={() => {
                    setIsEditingMax(false);
                    if (maxText.trim() !== "") {
                      const val = Number(maxText);
                      if (!isNaN(val) && val >= 0) {
                        commitUSD(valueUSD.min, toUSD(val, currency));
                      }
                    }
                  }}
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
          {currency !== "USD" && <p className="shrink-0 text-white/50">base: USD</p>}
        </div>
      </div>
  );
}