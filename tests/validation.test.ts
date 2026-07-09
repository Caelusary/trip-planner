import { describe, expect, it } from "vitest";
import { optionalDate, requireDate, requireText, requireUuid } from "@/lib/validation";

function fd(value: string): FormDataEntryValue {
  return value;
}

describe("requireText", () => {
  it("trims and returns valid text", () => {
    expect(requireText(fd("  Tokyo trip  "), "trip name")).toBe("Tokyo trip");
  });

  it("throws for null", () => {
    expect(() => requireText(null, "trip name")).toThrow("Invalid trip name.");
  });

  it("throws for a File value", () => {
    const file = new File(["x"], "x.txt");
    expect(() => requireText(file, "trip name")).toThrow("Invalid trip name.");
  });

  it("throws for empty/whitespace-only text", () => {
    expect(() => requireText(fd(""), "trip name")).toThrow("Invalid trip name.");
    expect(() => requireText(fd("   "), "trip name")).toThrow("Invalid trip name.");
  });

  it("throws when text exceeds the max length", () => {
    expect(() => requireText(fd("a".repeat(201)), "trip name")).toThrow("Invalid trip name.");
  });

  it("accepts text at exactly the max length", () => {
    expect(requireText(fd("a".repeat(200)), "trip name")).toHaveLength(200);
  });
});

describe("requireDate", () => {
  it("accepts a well-formed ISO date", () => {
    expect(requireDate(fd("2026-07-09"), "start date")).toBe("2026-07-09");
  });

  it("throws for a non-ISO format", () => {
    expect(() => requireDate(fd("07/09/2026"), "start date")).toThrow("Invalid start date.");
  });

  it("throws when digit grouping doesn't match YYYY-MM-DD", () => {
    expect(() => requireDate(fd("2026-7-9"), "start date")).toThrow("Invalid start date.");
  });

  it("throws for null", () => {
    expect(() => requireDate(null, "start date")).toThrow("Invalid start date.");
  });
});

describe("optionalDate", () => {
  it("returns null for null or empty string", () => {
    expect(optionalDate(null, "arrival date")).toBeNull();
    expect(optionalDate(fd(""), "arrival date")).toBeNull();
  });

  it("validates non-empty values like requireDate", () => {
    expect(optionalDate(fd("2026-07-09"), "arrival date")).toBe("2026-07-09");
    expect(() => optionalDate(fd("not-a-date"), "arrival date")).toThrow("Invalid arrival date.");
  });
});

describe("requireUuid", () => {
  it("accepts a well-formed v4 UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(requireUuid(uuid, "trip id")).toBe(uuid);
  });

  it("is case-insensitive", () => {
    const uuid = "550E8400-E29B-41D4-A716-446655440000";
    expect(requireUuid(uuid, "trip id")).toBe(uuid);
  });

  it("throws for a malformed value", () => {
    expect(() => requireUuid("not-a-uuid", "trip id")).toThrow("Invalid trip id.");
    expect(() => requireUuid("", "trip id")).toThrow("Invalid trip id.");
  });
});
