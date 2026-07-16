import "server-only";

import { CURRENCIES, type CurrencyCode, type LiveRates } from "./currency";

const RATES_URL = "https://api.frankfurter.dev/v1/latest";

/** Fetches current USD-based exchange rates. Free, keyless, ECB reference rates — updated once per weekday. */
export async function fetchLiveRates(): Promise<LiveRates | null> {
  const symbols = CURRENCIES.filter((c) => c.code !== "USD")
    .map((c) => c.code)
    .join(",");
  const url = `${RATES_URL}?base=USD&symbols=${symbols}`;

  try {
    // Rates move slowly enough that hourly freshness is plenty.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.rates || typeof data.rates !== "object") return null;

    const rates: LiveRates = { USD: 1 };
    for (const { code } of CURRENCIES) {
      const rate = data.rates[code];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        rates[code as CurrencyCode] = rate;
      }
    }
    return rates;
  } catch (error) {
    // Network failure or malformed payload — caller falls back to the
    // static table in lib/currency.ts instead of crashing.
    console.error("Live exchange rate fetch failed:", error);
    return null;
  }
}
