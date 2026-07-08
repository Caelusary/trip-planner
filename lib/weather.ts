import "server-only";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

export async function geocodeCity(query: string): Promise<GeoResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || !query) return null;

  const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const results = await res.json();
  const first = results?.[0];
  if (!first) return null;

  return {
    label: [first.name, first.state, first.country].filter(Boolean).join(", "),
    lat: first.lat,
    lon: first.lon,
  };
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
}

export async function getForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return [];

  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
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
}

export function forecastForDateRange(
  forecast: ForecastDay[],
  startDate: string,
  endDate: string,
): ForecastDay[] {
  return forecast.filter((day) => day.date >= startDate && day.date <= endDate);
}
