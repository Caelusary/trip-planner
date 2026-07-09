import { describe, expect, it } from "vitest";
import { currencySymbol, fromUSD, toUSD } from "@/lib/currency";

describe("fromUSD", () => {
  it("returns the same amount for USD", () => {
    expect(fromUSD(100, "USD")).toBe(100);
  });

  it("converts USD to another currency using its rate", () => {
    expect(fromUSD(100, "EUR")).toBeCloseTo(92, 5);
  });
});

describe("toUSD", () => {
  it("returns the same amount for USD", () => {
    expect(toUSD(100, "USD")).toBe(100);
  });

  it("is the inverse of fromUSD", () => {
    const converted = fromUSD(100, "JPY");
    expect(toUSD(converted, "JPY")).toBeCloseTo(100, 5);
  });
});

describe("currencySymbol", () => {
  it("returns the symbol for a known currency", () => {
    expect(currencySymbol("EUR")).toBe("€");
    expect(currencySymbol("JPY")).toBe("¥");
  });

  it("falls back to $ for an unknown code", () => {
    // @ts-expect-error deliberately passing an invalid code to test the fallback
    expect(currencySymbol("ZZZ")).toBe("$");
  });
});
