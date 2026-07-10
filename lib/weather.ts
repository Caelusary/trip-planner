import "server-only";

import { getOpenWeatherApiKey } from "@/lib/env";
import { COUNTRY_NAMES } from "@/lib/attractions";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const REVERSE_GEO_URL = "https://api.openweathermap.org/geo/1.0/reverse";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Lets a bare country name (e.g. "Japan") be scoped to its ISO country code
// below — see the comment in fetchGeoResults for why that matters.
const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

async function fetchGeoResults(query: string, limit: number): Promise<GeoResult[]> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey || !query) return [];

  // OpenWeatherMap's direct geocoding API only matches place NAMES — it has
  // no concept of "the country itself" — so a bare country name like
  // "Japan" can spuriously match an unrelated same-named locality elsewhere
  // (there's a real "Japan, Pennsylvania, US") instead of anywhere in the
  // actual country. When the query is exactly a known country name, scope
  // the search to that ISO country code instead: a same-name locality
  // outside the country can then never win, and if nothing inside the
  // country happens to share that name, this returns no results — a clear
  // "couldn't geocode this" rather than a confidently wrong location.
  const countryCode = COUNTRY_NAME_TO_CODE[query.trim().toLowerCase()];
  const effectiveQuery = countryCode ? `${query},${countryCode}` : query;

  const url = `${GEO_URL}?q=${encodeURIComponent(effectiveQuery)}&limit=${limit}&appid=${apiKey}`;
  try {
    // City→coords mappings are effectively static; cache for 30 days.
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return [];

    const results = await res.json();
    if (!Array.isArray(results)) return [];

    return results.map((r) => ({
      label: [r.name, r.state, r.country].filter(Boolean).join(", "),
      lat: r.lat,
      lon: r.lon,
    }));
  } catch (error) {
    // Network failure or malformed payload — degrade gracefully instead of
    // crashing the calling server action / page render.
    console.error("Geocoding request failed:", error);
    return [];
  }
}

export async function geocodeCity(query: string): Promise<GeoResult | null> {
  const [first] = await fetchGeoResults(query, 1);
  return first ?? null;
}

/** Multiple candidate matches for a partial query, for autocomplete dropdowns. */
export async function searchCities(query: string, limit = 5): Promise<GeoResult[]> {
  return fetchGeoResults(query, limit);
}

/** Resolves coordinates to an ISO 3166-1 alpha-2 country code, e.g. "US". */
export async function reverseGeocodeCountry(lat: number, lon: number): Promise<string | null> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) return null;

  const url = `${REVERSE_GEO_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return null;

    const [first] = await res.json();
    return first?.country ?? null;
  } catch (error) {
    console.error("Reverse geocoding request failed:", error);
    return null;
  }
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
}

export async function getForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) return [];

  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];

    const data = await res.json();
    const byDay = new Map<string, { temps: number[]; condition: string; icon: string }>();

    for (const entry of data.list ?? []) {
      const date = entry.dt_txt.split(" ")[0];
      const day: { temps: number[]; condition: string; icon: string } = byDay.get(date) ?? {
        temps: [],
        condition: entry.weather[0].main,
        icon: entry.weather[0].icon,
      };
      day.temps.push(entry.main.temp);
      byDay.set(date, day);
    }

    return Array.from(byDay.entries()).map(([date, day]) => ({
      date,
      tempMin: Math.round(Math.min(...day.temps)),
      tempMax: Math.round(Math.max(...day.temps)),
      condition: day.condition,
      icon: day.icon,
    }));
  } catch (error) {
    // Network failure or malformed payload — degrade gracefully instead of
    // crashing the trip detail page render.
    console.error("getForecast failed:", error);
    return [];
  }
}

export function forecastForDateRange(
  forecast: ForecastDay[],
  startDate: string,
  endDate: string,
): ForecastDay[] {
  return forecast.filter((day) => day.date >= startDate && day.date <= endDate);
}
