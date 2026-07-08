import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forecastForDateRange,
  geocodeCity,
  getForecast,
  searchCities,
  type ForecastDay,
} from "@/lib/weather";

const API_KEY = "test-api-key";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

describe("forecastForDateRange", () => {
  const forecast: ForecastDay[] = [
    { date: "2026-07-08", tempMin: 10, tempMax: 20, condition: "Clear", icon: "01d" },
    { date: "2026-07-09", tempMin: 11, tempMax: 21, condition: "Clouds", icon: "02d" },
    { date: "2026-07-10", tempMin: 12, tempMax: 22, condition: "Rain", icon: "10d" },
    { date: "2026-07-11", tempMin: 13, tempMax: 23, condition: "Clear", icon: "01d" },
  ];

  it("returns only days within the inclusive date range", () => {
    const result = forecastForDateRange(forecast, "2026-07-09", "2026-07-10");
    expect(result.map((d) => d.date)).toEqual(["2026-07-09", "2026-07-10"]);
  });

  it("includes boundary dates (start and end are inclusive)", () => {
    const result = forecastForDateRange(forecast, "2026-07-08", "2026-07-11");
    expect(result).toHaveLength(4);
  });

  it("returns an empty array for an inverted range (end before start)", () => {
    expect(forecastForDateRange(forecast, "2026-07-11", "2026-07-08")).toEqual([]);
  });

  it("returns an empty array when the range does not overlap the forecast", () => {
    expect(forecastForDateRange(forecast, "2026-08-01", "2026-08-05")).toEqual([]);
  });

  it("returns an empty array for an empty forecast", () => {
    expect(forecastForDateRange([], "2026-07-08", "2026-07-11")).toEqual([]);
  });
});

describe("getForecast", () => {
  beforeEach(() => {
    vi.stubEnv("OPENWEATHER_API_KEY", API_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("groups 3-hourly entries by day and computes rounded min/max temps", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          list: [
            {
              dt_txt: "2026-07-08 09:00:00",
              main: { temp: 14.4 },
              weather: [{ main: "Clouds", icon: "02d" }],
            },
            {
              dt_txt: "2026-07-08 15:00:00",
              main: { temp: 21.6 },
              weather: [{ main: "Clear", icon: "01d" }],
            },
            {
              dt_txt: "2026-07-09 12:00:00",
              main: { temp: 18.2 },
              weather: [{ main: "Rain", icon: "10d" }],
            },
          ],
        }),
      ),
    );

    const result = await getForecast(51.5, -0.12);

    expect(result).toEqual([
      // condition/icon come from the first entry seen for each day
      { date: "2026-07-08", tempMin: 14, tempMax: 22, condition: "Clouds", icon: "02d" },
      { date: "2026-07-09", tempMin: 18, tempMax: 18, condition: "Rain", icon: "10d" },
    ]);
  });

  it("returns [] when the API key is missing (fetch never called)", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await getForecast(51.5, -0.12)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns [] when the API responds with a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "boom" }, false)));
    expect(await getForecast(51.5, -0.12)).toEqual([]);
  });

  it("returns [] when the payload has no list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({})));
    expect(await getForecast(51.5, -0.12)).toEqual([]);
  });
});

describe("geocodeCity", () => {
  beforeEach(() => {
    vi.stubEnv("OPENWEATHER_API_KEY", API_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a 'name, state, country' label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([{ name: "Austin", state: "Texas", country: "US", lat: 30.27, lon: -97.74 }]),
      ),
    );

    expect(await geocodeCity("Austin")).toEqual({
      label: "Austin, Texas, US",
      lat: 30.27,
      lon: -97.74,
    });
  });

  it("omits missing state from the label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ name: "Paris", country: "FR", lat: 48.85, lon: 2.35 }])),
    );

    expect(await geocodeCity("Paris")).toMatchObject({ label: "Paris, FR" });
  });

  it("returns null when the query matches no city", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
    expect(await geocodeCity("xyzzy-not-a-city")).toBeNull();
  });

  it("returns null for an empty query without calling the API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await geocodeCity("")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when the API key is missing", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await geocodeCity("Austin")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when the API responds with a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ cod: 401 }, false)));
    expect(await geocodeCity("Austin")).toBeNull();
  });
});

describe("searchCities", () => {
  beforeEach(() => {
    vi.stubEnv("OPENWEATHER_API_KEY", API_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps every result, not just the first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          { name: "Paris", country: "FR", lat: 48.85, lon: 2.35 },
          { name: "Paris", state: "Texas", country: "US", lat: 33.66, lon: -95.56 },
        ]),
      ),
    );

    expect(await searchCities("Paris")).toEqual([
      { label: "Paris, FR", lat: 48.85, lon: 2.35 },
      { label: "Paris, Texas, US", lat: 33.66, lon: -95.56 },
    ]);
  });

  it("requests the given limit", async () => {
    const fetchSpy = vi.fn(async (_url: string) => jsonResponse([]));
    vi.stubGlobal("fetch", fetchSpy);

    await searchCities("Paris", 8);
    expect(fetchSpy.mock.calls[0][0]).toContain("limit=8");
  });

  it("returns [] for a non-array payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ cod: 200 })));
    expect(await searchCities("Paris")).toEqual([]);
  });

  it("returns [] for an empty query without calling the API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await searchCities("")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
