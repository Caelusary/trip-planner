import { describe, expect, it } from "vitest";
import { authErrorCode, authErrorMessage } from "@/lib/auth-errors";

describe("authErrorCode", () => {
  it("passes through a known code", () => {
    expect(authErrorCode({ code: "invalid_credentials" })).toBe("invalid_credentials");
  });

  it("falls back to 'unknown' for a code not on the allowlist", () => {
    // This is the security-relevant behavior: Supabase (or anything else)
    // could hand back arbitrary free-form text as `code`, and it must never
    // be passed through to the client-rendered `?error=` banner unvetted.
    expect(authErrorCode({ code: "<script>alert(1)</script>" })).toBe("unknown");
  });

  it("falls back to 'unknown' when code is missing", () => {
    expect(authErrorCode({})).toBe("unknown");
    expect(authErrorCode(undefined)).toBe("unknown");
    expect(authErrorCode(null)).toBe("unknown");
  });
});

describe("authErrorMessage", () => {
  it("returns the mapped message for a known code", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Incorrect email or password.");
  });

  it("returns the default message for an unrecognized code", () => {
    expect(authErrorMessage("something_made_up")).toBe("Something went wrong. Please try again.");
  });

  it("returns the default message for undefined", () => {
    expect(authErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("never echoes the input code back verbatim for an unknown code", () => {
    // Guards against a regression that renders `code` itself into the page
    // (a `?error=` query param is attacker-controlled input).
    const maliciousCode = "<img src=x onerror=alert(1)>";
    expect(authErrorMessage(maliciousCode)).not.toContain(maliciousCode);
  });
});
