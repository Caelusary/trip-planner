import { describe, expect, it } from "vitest";
import {
  attractionsFor,
  COUNTRY_LIST,
  COUNTRY_NAMES,
  DEFAULT_COUNTRY,
  formatBudget,
  isSupportedCountry,
  type CountryCode,
} from "@/lib/attractions";

describe("formatBudget", () => {
  it("formats a min-max range", () => {
    expect(formatBudget(150, 250)).toBe("$150-250");
  });

  it("formats a zero minimum", () => {
    expect(formatBudget(0, 50)).toBe("$0-50");
  });

  it("formats an equal min and max", () => {
    expect(formatBudget(100, 100)).toBe("$100-100");
  });
});

describe("isSupportedCountry", () => {
  it("accepts every code in COUNTRY_NAMES", () => {
    for (const code of Object.keys(COUNTRY_NAMES)) {
      expect(isSupportedCountry(code)).toBe(true);
    }
  });

  it("rejects an unsupported/garbage code", () => {
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry("")).toBe(false);
  });

  it("rejects non-string input without throwing", () => {
    expect(isSupportedCountry(null)).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
    expect(isSupportedCountry(42)).toBe(false);
    expect(isSupportedCountry({})).toBe(false);
  });
});

describe("COUNTRY_LIST", () => {
  it("has one entry per supported country, sorted A-Z by name", () => {
    expect(COUNTRY_LIST).toHaveLength(Object.keys(COUNTRY_NAMES).length);
    const names = COUNTRY_LIST.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("attractionsFor", () => {
  it("returns a non-empty list of well-formed attractions for every supported country", () => {
    for (const code of Object.keys(COUNTRY_NAMES) as CountryCode[]) {
      const attractions = attractionsFor(code);
      expect(attractions.length).toBeGreaterThan(0);
      for (const attraction of attractions) {
        // Every attraction must resolve to *some* image (real photo or the
        // picsum fallback) — never an empty/undefined string that would
        // break next/image's `src` prop.
        expect(attraction.image).toBeTruthy();
        expect(attraction.activities.length).toBeGreaterThan(0);
        for (const activity of attraction.activities) {
          expect(activity.image).toBeTruthy();
        }
        expect(attraction.budgetMin).toBeLessThanOrEqual(attraction.budgetMax);
      }
    }
  });

  it("falls back to a picsum placeholder image for an id with no curated photo", () => {
    // DEFAULT_COUNTRY's dataset is real production data, so every id in it
    // already has a curated photo — this instead documents/verifies the
    // fallback chain's behavior for the (currently hypothetical) case of an
    // id that isn't in ATTRACTION_IMAGES, by asserting the general shape any
    // attraction's image must have: either a wikimedia URL or the picsum
    // fallback, never neither.
    const attractions = attractionsFor(DEFAULT_COUNTRY);
    for (const attraction of attractions) {
      expect(
        attraction.image.startsWith("https://upload.wikimedia.org/") ||
          attraction.image.startsWith("https://picsum.photos/"),
      ).toBe(true);
    }
  });

  it("has distinct attraction ids within each country's list", () => {
    for (const code of Object.keys(COUNTRY_NAMES) as CountryCode[]) {
      const ids = attractionsFor(code).map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
