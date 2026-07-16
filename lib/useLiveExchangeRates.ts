"use client";

import { useEffect, useState } from "react";
import type { LiveRates } from "./currency";

/** Live USD exchange rates, fetched once after mount. Null until loaded (or if the fetch fails) — callers fall back to the static table in lib/currency.ts. */
export function useLiveExchangeRates(): LiveRates | null {
  const [rates, setRates] = useState<LiveRates | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exchange-rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.rates) setRates(data.rates);
      })
      .catch(() => {
        // Network failure — stay on the static fallback rates.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rates;
}
