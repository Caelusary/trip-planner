import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cityCode, formatDateRange, formatDayShort, tripCountdownLabel } from "@/lib/format";

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

describe("tripCountdownLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down to a future trip", () => {
    expect(tripCountdownLabel("2026-07-23", "2026-07-30")).toBe("14 days to go");
  });

  it("uses singular phrasing for exactly one day out", () => {
    expect(tripCountdownLabel("2026-07-10", "2026-07-15")).toBe("1 day to go");
  });

  it("treats a same-day start as ongoing, not upcoming", () => {
    expect(tripCountdownLabel("2026-07-09", "2026-07-15")).toBe("6 days left");
  });

  it("counts down the days left on an ongoing trip", () => {
    expect(tripCountdownLabel("2026-07-05", "2026-07-12")).toBe("3 days left");
  });

  it("uses singular phrasing for the second-to-last day", () => {
    expect(tripCountdownLabel("2026-07-05", "2026-07-10")).toBe("1 day left");
  });

  it("says it's the last day when the trip ends today", () => {
    expect(tripCountdownLabel("2026-07-05", "2026-07-09")).toBe("Last day");
  });

  it("returns null for a trip that already ended", () => {
    expect(tripCountdownLabel("2026-06-01", "2026-06-05")).toBeNull();
  });
});
