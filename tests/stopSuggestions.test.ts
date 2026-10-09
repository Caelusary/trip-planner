import { describe, expect, it } from "vitest";
import { attractionsFor, countryCodeFromLabel } from "@/lib/attractions";
import { formatWeekdayShort } from "@/lib/format";
import { suggestStopsForTrip } from "@/lib/stopSuggestions";

describe("countryCodeFromLabel", () => {
  it("reads the ISO code from the end of a geocoded label", () => {
    expect(countryCodeFromLabel("Kyoto, Kyoto, JP")).toBe("JP");
    expect(countryCodeFromLabel("Paris, FR")).toBe("FR");
  });

  it("tolerates stray whitespace and lowercase", () => {
    expect(countryCodeFromLabel("Kyoto,  jp ")).toBe("JP");
  });

  it("returns null for labels that didn't come through the geocoder or an unsupported country", () => {
    expect(countryCodeFromLabel("Kyoto")).toBeNull();
    expect(countryCodeFromLabel("Somewhere, ZZ")).toBeNull();
    expect(countryCodeFromLabel("")).toBeNull();
  });
});

describe("suggestStopsForTrip", () => {
  it("puts same-city attractions first, each group ranked by rating", () => {
    const picks = suggestStopsForTrip("Kyoto, Kyoto, JP", [], 50);
    const firstOther = picks.findIndex((a) => a.city !== "Kyoto");
    const kyoto = picks.slice(0, firstOther === -1 ? picks.length : firstOther);

    expect(kyoto.length).toBeGreaterThan(0);
    expect(kyoto.every((a) => a.city === "Kyoto")).toBe(true);
    expect(picks.slice(kyoto.length).every((a) => a.city !== "Kyoto")).toBe(true);
    const ratings = kyoto.map((a) => a.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it("leaves out stops already on the trip, ignoring case", () => {
    const [top] = suggestStopsForTrip("Kyoto, Kyoto, JP", []);
    const next = suggestStopsForTrip("Kyoto, Kyoto, JP", [top.name.toUpperCase()]);
    expect(next.map((a) => a.id)).not.toContain(top.id);
  });

  it("caps the list at the limit, defaulting to 6", () => {
    expect(suggestStopsForTrip("Tokyo, JP", []).length).toBeLessThanOrEqual(6);
    expect(suggestStopsForTrip("Tokyo, JP", [], 2)).toHaveLength(2);
  });

  it("never suggests more than the country has", () => {
    expect(suggestStopsForTrip("Tokyo, JP", [], 999)).toHaveLength(attractionsFor("JP").length);
  });

  it("returns nothing when the country can't be recovered", () => {
    expect(suggestStopsForTrip("Kyoto", [])).toEqual([]);
  });
});

describe("formatWeekdayShort", () => {
  it("formats an ISO date as a short weekday in UTC", () => {
    expect(formatWeekdayShort("2026-07-09")).toBe("Thu");
  });

  it("returns an empty string for missing input", () => {
    expect(formatWeekdayShort(null)).toBe("");
    expect(formatWeekdayShort(undefined)).toBe("");
  });
});
