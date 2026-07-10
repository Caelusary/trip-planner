import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientKey, clientKeyFromHeaders, isRateLimited } from "@/lib/rate-limit";

// isRateLimited keeps its hit-counter map at module scope, so every test
// here uses a unique key (a fresh Symbol-derived string per test) instead of
// resetting internal state between tests — there's no exported reset hook,
// and reaching into module internals would be more brittle than just never
// colliding on the same key.
let keySeq = 0;
function uniqueKey(label: string): string {
  keySeq += 1;
  return `${label}:${keySeq}`;
}

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request under any positive limit", () => {
    expect(isRateLimited(uniqueKey("first"), 1)).toBe(false);
  });

  it("allows requests up to exactly the limit, then blocks the next one", () => {
    const key = uniqueKey("boundary");
    const limit = 3;
    // 1st through 3rd requests: count reaches 1, 2, 3 — all <= limit.
    expect(isRateLimited(key, limit)).toBe(false);
    expect(isRateLimited(key, limit)).toBe(false);
    expect(isRateLimited(key, limit)).toBe(false);
    // 4th request: count reaches 4 > limit.
    expect(isRateLimited(key, limit)).toBe(true);
  });

  it("keeps blocking every request once the limit is exceeded, within the same window", () => {
    const key = uniqueKey("keeps-blocking");
    for (let i = 0; i < 5; i++) isRateLimited(key, 2);
    expect(isRateLimited(key, 2)).toBe(true);
    expect(isRateLimited(key, 2)).toBe(true);
  });

  it("resets the count once the window rolls over", () => {
    const key = uniqueKey("window-reset");
    const limit = 1;
    expect(isRateLimited(key, limit)).toBe(false);
    expect(isRateLimited(key, limit)).toBe(true);

    // Advance just past the 60s fixed window.
    vi.advanceTimersByTime(60_001);

    expect(isRateLimited(key, limit)).toBe(false);
  });

  it("tracks distinct keys independently", () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");
    isRateLimited(keyA, 1);
    expect(isRateLimited(keyA, 1)).toBe(true);
    // A fresh key hasn't been touched yet, so it isn't rate limited.
    expect(isRateLimited(keyB, 1)).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  it("uses the first entry of a comma-separated X-Forwarded-For list", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientKeyFromHeaders(headers)).toBe("1.2.3.4");
  });

  it("trims whitespace around the first IP", () => {
    const headers = new Headers({ "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" });
    expect(clientKeyFromHeaders(headers)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is missing", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });

  it("falls back to 'unknown' when the header is present but empty", () => {
    const headers = new Headers({ "x-forwarded-for": "" });
    expect(clientKeyFromHeaders(headers)).toBe("unknown");
  });
});

describe("clientKey", () => {
  it("reads X-Forwarded-For off a Request the same way clientKeyFromHeaders does", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    expect(clientKey(request)).toBe("9.9.9.9");
  });
});
