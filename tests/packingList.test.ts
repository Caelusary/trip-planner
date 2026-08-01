import { describe, expect, it } from "vitest";
import { generatePackingList } from "@/lib/packingList";
import type { ForecastDay } from "@/lib/weather";

function day(overrides: Partial<ForecastDay>): ForecastDay {
  return { date: "2026-09-12", tempMin: 15, tempMax: 20, condition: "Clear", icon: "01d", ...overrides };
}

describe("generatePackingList", () => {
  it("always includes the base items", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", []);
    expect(items).toEqual(
      expect.arrayContaining(["Passport or ID", "Phone charger", "Wallet & cards", "Toiletries", "Medications"]),
    );
  });

  it("scales clothing counts with trip length", () => {
    const items = generatePackingList("2026-09-12", "2026-09-15", []);
    // Sep 12–15 inclusive is 4 days.
    expect(items).toContain("T-shirts / tops (x4)");
    expect(items).toContain("Underwear & socks (x4)");
  });

  it("caps clothing counts at 10 for long trips", () => {
    const items = generatePackingList("2026-09-01", "2026-10-01", []);
    expect(items).toContain("T-shirts / tops (x10)");
  });

  it("adds no weather-specific items when there's no forecast data", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", []);
    expect(items).not.toContain("Sunscreen");
    expect(items).not.toContain("Warm jacket");
    expect(items).not.toContain("Rain jacket or umbrella");
    expect(items).not.toContain("Snow boots");
  });

  it("suggests sun protection for a hot forecast", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", [day({ tempMax: 32 })]);
    expect(items).toContain("Sunscreen");
    expect(items).toContain("Sunglasses");
  });

  it("suggests warm layers for a cold forecast", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", [day({ tempMin: 2 })]);
    expect(items).toContain("Warm jacket");
    expect(items).toContain("Gloves & hat");
  });

  it("suggests rain gear for a rainy forecast", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", [day({ condition: "Rain" })]);
    expect(items).toContain("Rain jacket or umbrella");
  });

  it("suggests snow boots for a snowy forecast", () => {
    const items = generatePackingList("2026-09-12", "2026-09-12", [day({ condition: "Snow" })]);
    expect(items).toContain("Snow boots");
  });
});
