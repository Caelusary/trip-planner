import { describe, expect, it } from "vitest";
import { buildICS } from "@/lib/ics";

describe("buildICS", () => {
  it("wraps a single event in a valid VCALENDAR with an exclusive DTEND", () => {
    const ics = buildICS("Anniversary in Rome", [
      { uid: "trip-1", title: "Anniversary in Rome", startDate: "2026-09-12", endDate: "2026-09-18" },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("SUMMARY:Anniversary in Rome");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260912");
    // DTEND is exclusive on an all-day event, so the last inclusive day (18th) becomes the 19th.
    expect(ics).toContain("DTEND;VALUE=DATE:20260919");
  });

  it("escapes commas, semicolons, and newlines in text fields", () => {
    const ics = buildICS("cal", [
      {
        uid: "stop-1",
        title: "Dinner, drinks; dancing",
        startDate: "2026-09-13",
        endDate: "2026-09-13",
        description: "Line one\nLine two",
      },
    ]);
    expect(ics).toContain("SUMMARY:Dinner\\, drinks\\; dancing");
    expect(ics).toContain("Line one\\nLine two");
  });

  it("emits one VEVENT per input event", () => {
    const ics = buildICS("cal", [
      { uid: "a", title: "A", startDate: "2026-01-01", endDate: "2026-01-01" },
      { uid: "b", title: "B", startDate: "2026-01-02", endDate: "2026-01-02" },
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("folds lines longer than 75 octets with a leading space continuation", () => {
    const longTitle = "A".repeat(100);
    const ics = buildICS("cal", [
      { uid: "long", title: longTitle, startDate: "2026-01-01", endDate: "2026-01-01" },
    ]);
    const lines = ics.split("\r\n");
    const summaryLineIndex = lines.findIndex((l) => l.startsWith("SUMMARY:"));
    expect(lines[summaryLineIndex].length).toBeLessThanOrEqual(75);
    expect(lines[summaryLineIndex + 1].startsWith(" ")).toBe(true);
  });
});
