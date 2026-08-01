import type { ForecastDay } from "@/lib/weather";

const BASE_ITEMS = ["Passport or ID", "Phone charger", "Wallet & cards", "Toiletries", "Medications"];

/** Clothing quantities scale with trip length but cap out — a 3-week trip doesn't need 21 pairs of socks packed, just laundry. */
const MAX_CLOTHING_COUNT = 10;

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * Best-effort packing suggestions from trip length plus whatever forecast
 * is available for its dates (already fetched for the weather section —
 * see getForecast/forecastForDateRange in lib/weather.ts). An empty
 * `forecast` (destination not geocoded, trip too far out for OpenWeatherMap's
 * 5-day window, API outage) just means no weather-specific items get
 * suggested, not that the whole list is empty.
 */
export function generatePackingList(
  startDate: string,
  endDate: string,
  forecast: ForecastDay[],
): string[] {
  const clothingCount = Math.min(daysBetweenInclusive(startDate, endDate), MAX_CLOTHING_COUNT);

  const items = [
    ...BASE_ITEMS,
    `T-shirts / tops (x${clothingCount})`,
    `Underwear & socks (x${clothingCount})`,
  ];

  if (forecast.some((day) => day.tempMax >= 27)) {
    items.push("Sunscreen", "Sunglasses");
  }
  if (forecast.some((day) => day.tempMin <= 10)) {
    items.push("Warm jacket", "Gloves & hat");
  }
  if (forecast.some((day) => /rain|drizzle|thunderstorm/i.test(day.condition))) {
    items.push("Rain jacket or umbrella");
  }
  if (forecast.some((day) => /snow/i.test(day.condition))) {
    items.push("Snow boots");
  }

  return items;
}
