import { AxeBuilder } from "@axe-core/playwright";
import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import { FIXTURE_USER, KYOTO_ID, LISBON_ID, SHARE_TOKEN } from "./fixtures.mjs";

export const MOCK = "http://127.0.0.1:54321";

// 1x1 slate-blue PNG.
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQCkUWa8AAAAAElFTkSuQmCC",
  "base64",
);

/** Puts the mock database back to the fixture state and clears any outage. */
export async function resetMock() {
  await fetch(`${MOCK}/__reset`, { method: "POST" });
}

/** Leaves the signed-in account with no trips, stops or packing items. */
export async function emptyMock() {
  await fetch(`${MOCK}/__empty`, { method: "POST" });
}

/** Makes every Supabase REST call fail with a 500 until the next reset. */
export async function failMock(on: boolean) {
  await fetch(`${MOCK}/__fail`, { method: "POST", body: JSON.stringify({ on }) });
}

/**
 * Signs the browser in by writing the same session cookie @supabase/ssr
 * would set after a real login, holding the mock's fake token.
 */
export async function signIn(context: BrowserContext, baseURL: string) {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: FIXTURE_USER.accessToken,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: now + 86_400,
    user: FIXTURE_USER.user,
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ name: "sb-127-auth-token", value, url: baseURL }]);
}

/** Fails on serious or critical accessibility violations on the current page. */
export async function expectAccessible(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Leaflet's third-party map tiles and controls aren't ours to fix.
    .exclude(".leaflet-container")
    .analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${where}: ${v.id} (${v.nodes.length}) ${v.help} -> ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);
}

/**
 * Every visible control is at least 44x44 CSS px (links inside a sentence
 * are exempt, as in WCAG 2.5.8). Leaflet's own map controls are skipped.
 */
export async function expectTapTargets(page: Page, where: string) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a, button, input, select, textarea, summary")]
      .filter((el) => {
        if (el.closest(".leaflet-container, p, .sr-only") || el.classList.contains("sr-only")) return false;
        if (el instanceof HTMLInputElement && ["hidden", "range"].includes(el.type)) return false;
        // Carousel page dots: 10 of them at 44px wouldn't fit a phone; they
        // meet WCAG 2.5.8's 24px minimum and duplicate the prev/next buttons.
        if (el.getAttribute("aria-label")?.startsWith("Jump to")) return false;
        if (el.closest("[aria-hidden='true']") || getComputedStyle(el).visibility === "hidden") return false;
        // Measure what the finger actually hits: a checkbox's label, or the
        // styled field wrapper around a bare input.
        const target =
          el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)
            ? (el.closest("label") ?? el)
            : el.tagName === "INPUT" && !el.classList.contains("glass-input")
              ? (el.closest<HTMLElement>(".glass-input") ?? el)
              : el;
        // offset* sizes ignore CSS transforms (the 3D carousel scales cards).
        const { offsetWidth: w, offsetHeight: h } = target as HTMLElement;
        if (w === 0 || h === 0) return false;
        return h < 44 || w < 44;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}" ${el.offsetWidth}x${el.offsetHeight}`),
  );
  expect(small, `${where} has tap targets under 44px`).toEqual([]);
}

/** Nothing on the page is wider than the viewport (no sideways scroll). */
export async function expectNoSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${where} scrolls sideways`).toBeLessThanOrEqual(0);
}

/**
 * Every test resets the mock database, and fails on any
 * Content-Security-Policy violation (next start serves the real headers).
 */
export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      await resetMock();
      // Attraction photos are proxied through next/image from Wikimedia and
      // picsum; serve a local placeholder instead so tests never depend on
      // (or hammer) third-party hosts.
      await page.route("**/_next/image**", (route) =>
        route.fulfill({ status: 200, contentType: "image/png", body: PLACEHOLDER_PNG }),
      );
      // Anything else headed off this machine from the browser is blocked,
      // so a test can never quietly depend on a live third party.
      await page.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (route) => route.abort());
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && /Content.Security.Policy/i.test(msg.text())) violations.push(msg.text());
      });
      await use(violations);
      expect(violations).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export { FIXTURE_USER, KYOTO_ID, LISBON_ID, SHARE_TOKEN };
