import { describe, expect, it } from "vitest";
import { cityCode, formatDateRange, formatDayShort } from "@/lib/format";

describe("formatDayShort", () => {
  it("formats an ISO date as weekday, month, day", () => {
    expect(formatDayShort("2026-07-09")).toBe("Thu, Jul 9");
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(formatDayShort(null)).toBe("");
    expect(formatDayShort(undefined)).toBe("");
    expect(formatDayShort("")).toBe("");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatDayShort("not-a-date")).toBe("");
  });
});

describe("formatDateRange", () => {
  it("collapses to a single date when start equals end", () => {
    expect(formatDateRange("2026-07-09", "2026-07-09")).toBe("Jul 9, 2026");
  });

  it("formats a range within the same month", () => {
    expect(formatDateRange("2026-07-09", "2026-07-12")).toBe("Jul 9 – 12, 2026");
  });

  it("formats a range spanning two months in the same year", () => {
    expect(formatDateRange("2026-07-30", "2026-08-02")).toBe("Jul 30 – Aug 2, 2026");
  });

  it("formats a range spanning two years", () => {
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("Dec 30, 2026 – Jan 2, 2027");
  });

  it("falls back to 'From <date>' when only start is set", () => {
    expect(formatDateRange("2026-07-09", null)).toBe("From Jul 9, 2026");
  });

  it("falls back to 'Until <date>' when only end is set", () => {
    expect(formatDateRange(null, "2026-07-09")).toBe("Until Jul 9, 2026");
  });

  it("returns an empty string when neither date is set", () => {
    expect(formatDateRange(null, null)).toBe("");
    expect(formatDateRange(undefined, undefined)).toBe("");
  });
});

describe("cityCode", () => {
  it("takes the first three letters of the city name, uppercased", () => {
    expect(cityCode("Tokyo")).toBe("TOK");
  });

  it("ignores everything after the first comma", () => {
    expect(cityCode("Tokyo, JP")).toBe("TOK");
  });

  it("strips non-letter characters before taking the first three", () => {
    expect(cityCode("St. Louis")).toBe("STL");
  });

  it("falls back to an em dash for input with no letters", () => {
    expect(cityCode("123")).toBe("—");
    expect(cityCode("")).toBe("—");
  });
});
