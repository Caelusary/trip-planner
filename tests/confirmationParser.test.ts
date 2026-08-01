import { describe, expect, it } from "vitest";
import { parseConfirmationText } from "@/lib/confirmationParser";

describe("parseConfirmationText", () => {
  it("returns nothing for empty/blank input", () => {
    expect(parseConfirmationText("")).toEqual({});
    expect(parseConfirmationText("   ")).toEqual({});
  });

  it("parses a flight confirmation email", () => {
    const text = `
      Your flight itinerary is confirmed.
      Confirmation Number: ABC123
      Flight to Tokyo
      Departure: September 12, 2026
      Boarding begins one hour before departure. Please arrive at the gate early.
    `;
    const result = parseConfirmationText(text);
    expect(result.confirmationNumber).toBe("ABC123");
    expect(result.city).toBe("Tokyo");
    expect(result.arrivalDate).toBe("2026-09-12");
    expect(result.stopType).toBe("flight");
  });

  it("parses a hotel confirmation email with a date range", () => {
    const text = `
      Booking Confirmation: HTL9988
      Hotel Roma Palace
      Check-in: 09/12/2026
      Check-out: 09/18/2026
      We look forward to your stay — your room reservation is complete.
    `;
    const result = parseConfirmationText(text);
    expect(result.confirmationNumber).toBe("HTL9988");
    expect(result.arrivalDate).toBe("2026-09-12");
    expect(result.departureDate).toBe("2026-09-18");
    expect(result.stopType).toBe("lodging");
  });

  it("parses a restaurant reservation", () => {
    const text = `
      Reservation at Trattoria Roma
      Reservation Number: RS4501
      Table for 2 on 2026-09-13
    `;
    const result = parseConfirmationText(text);
    expect(result.confirmationNumber).toBe("RS4501");
    expect(result.arrivalDate).toBe("2026-09-13");
    expect(result.stopType).toBe("restaurant");
  });

  it("falls back to an airport code when no labeled city is present", () => {
    const text = "Your flight departs for (JFK) on January 5, 2027. PNR: XY7Z12";
    const result = parseConfirmationText(text);
    expect(result.city).toBe("JFK");
    expect(result.confirmationNumber).toBe("XY7Z12");
    expect(result.arrivalDate).toBe("2027-01-05");
  });

  it("defaults to 'activity' when nothing matches the other stop-type keywords", () => {
    const text = "Museum tickets confirmed for Destination: Paris on 2026-10-01.";
    const result = parseConfirmationText(text);
    expect(result.stopType).toBe("activity");
    expect(result.city).toBe("Paris");
  });

  it("rejects an invalid calendar date instead of silently normalizing it", () => {
    const result = parseConfirmationText("Confirmation: AB12CD, arriving February 30, 2026");
    expect(result.arrivalDate).toBeUndefined();
  });

  it("orders two out-of-sequence dates chronologically into arrival/departure", () => {
    const result = parseConfirmationText("Stay from 2026-09-18 to 2026-09-12");
    expect(result.arrivalDate).toBe("2026-09-12");
    expect(result.departureDate).toBe("2026-09-18");
  });
});
