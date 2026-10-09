import {
  emptyMock,
  expect,
  expectAccessible,
  expectNoSidewaysScroll,
  expectTapTargets,
  failMock,
  FIXTURE_USER,
  KYOTO_ID,
  SHARE_TOKEN,
  signIn,
  test,
} from "./helpers";

test.describe("signed out", () => {
  test("private pages send you to log in, and a wrong password says so", async ({ page }) => {
    await page.goto("/trips/upcoming");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back");
    await expectAccessible(page, "login");
    await expectNoSidewaysScroll(page, "login");
    await expectTapTargets(page, "login");

    await page.getByLabel("Email").fill(FIXTURE_USER.user.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/error=invalid_credentials/);
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expectAccessible(page, "login error");

    await page.getByLabel("Email").fill(FIXTURE_USER.user.email);
    await page.getByLabel("Password").fill(FIXTURE_USER.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/trips$/);
  });

  test("sign up page, and a taken email", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your account");
    await expectAccessible(page, "signup");
    await expectNoSidewaysScroll(page, "signup");
    await expectTapTargets(page, "signup");

    await page.getByLabel("Email").fill("someone@example.test");
    await page.getByLabel("Password").fill("e2e-password-2");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("An account with that email already exists.")).toBeVisible();
  });

  test("a shared trip is readable without an account, a bad link is a 404", async ({ page }) => {
    await page.goto(`/shared/${SHARE_TOKEN}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spring in Kyoto");
    await expect(page.getByText("Osaka")).toBeVisible();
    await expectAccessible(page, "shared trip");
    await expectNoSidewaysScroll(page, "shared trip");
    await expectTapTargets(page, "shared trip");

    const missing = await page.goto("/shared/00000000-0000-4000-8000-00000000dead");
    expect(missing?.status()).toBe(404);
    await expectAccessible(page, "not found");
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test("explore, plan a trip, then work on it", async ({ page }) => {
    await page.goto("/trips");
    await expect(page.getByRole("combobox", { name: "Choose a country" })).toBeVisible();
    await expectAccessible(page, "explore");
    await expectNoSidewaysScroll(page, "explore");
    await expectTapTargets(page, "explore");

    // No-results state for the attraction search.
    await page.getByRole("textbox", { name: /Search attractions/ }).fill("zzzz no such place");
    await expect(page.getByText(/No attractions match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();

    await page.getByRole("link", { name: "Plan a trip" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a new trip");
    await expectAccessible(page, "plan");
    await expectNoSidewaysScroll(page, "plan");
    await expectTapTargets(page, "plan");

    await page.getByLabel("Trip name").fill("Autumn in Seoul");
    await page.getByLabel("Destination city").fill("Seoul");
    await page.getByLabel("Start date").fill("2027-10-01");
    await page.getByLabel("End date").fill("2027-10-08");
    await page.getByRole("button", { name: "Create trip" }).click();

    await expect(page).toHaveURL(/\/trips\/upcoming$/);
    await expect(page.getByRole("link", { name: /Autumn in Seoul/ })).toBeVisible();
    await expectAccessible(page, "upcoming");
    await expectNoSidewaysScroll(page, "upcoming");
    await expectTapTargets(page, "upcoming");

    await page.getByRole("link", { name: /Spring in Kyoto/ }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${KYOTO_ID}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spring in Kyoto");
    await expect(page.getByText("Confirmation #JL7XQ2")).toBeVisible();
    await expectAccessible(page, "trip detail");
    await expectNoSidewaysScroll(page, "trip detail");
    await expectTapTargets(page, "trip detail");

    // Add a stop.
    await page.getByLabel("City").fill("Nara");
    await page.getByRole("button", { name: "Add stop" }).click();
    await expect(page.getByRole("button", { name: "Remove Nara from this trip" })).toBeVisible();

    // Packing list: add an item.
    await page.getByPlaceholder("Add an item").fill("Umbrella");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Umbrella")).toBeVisible();

    await page.getByRole("link", { name: "Trip pass" }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${KYOTO_ID}/pass$`));
    await expect(page.getByText("Spring in Kyoto").first()).toBeVisible();
    await expectAccessible(page, "trip pass");
    await expectNoSidewaysScroll(page, "trip pass");
    await expectTapTargets(page, "trip pass");
  });

  test("history, saved and account", async ({ page }) => {
    await page.goto("/trips/history");
    await expect(page.getByRole("link", { name: /Lisbon long weekend/ })).toBeVisible();
    await expectAccessible(page, "history");

    await page.getByRole("link", { name: "Saved" }).click();
    await expect(page.getByText(/Nothing saved yet/)).toBeVisible();
    await expectAccessible(page, "saved (empty)");
    await expectNoSidewaysScroll(page, "saved");
    await expectTapTargets(page, "saved");

    await page.getByRole("link", { name: "Account" }).click();
    await expect(page.getByText(FIXTURE_USER.user.email)).toBeVisible();
    await expectAccessible(page, "account");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a brand new account shows designed empty states", async ({ page }) => {
    await emptyMock();
    await page.goto("/trips/upcoming");
    await expect(page.getByText("No departures scheduled")).toBeVisible();
    await expectAccessible(page, "upcoming (empty)");
    await page.goto("/trips/history");
    await expect(page.getByText(/No past trips yet/)).toBeVisible();
    await expectAccessible(page, "history (empty)");
  });

  test("a failed request shows an error, not an empty list", async ({ page }) => {
    await failMock(true);
    await page.goto("/trips/upcoming");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("try again");
    await expect(page.getByText("No departures scheduled")).toHaveCount(0);
    await expectAccessible(page, "upcoming (error)");

    await failMock(false);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("link", { name: /Spring in Kyoto/ })).toBeVisible();
  });

  test("a trip that isn't yours is a 404", async ({ page }) => {
    const res = await page.goto("/trips/99999999-9999-4999-8999-999999999999");
    expect(res?.status()).toBe(404);
  });
});

test.describe("security headers", () => {
  test("a strict, per-request nonce CSP and the usual hardening headers", async ({ page }) => {
    const first = await page.goto("/login");
    const headers = first!.headers();
    const csp = headers["content-security-policy"];
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"))!;
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    // A fresh nonce each request, and Next's own scripts carry it.
    const nonce = scriptSrc.match(/'nonce-([^']+)'/)![1];
    const second = await page.request.get("/login");
    expect(second.headers()["content-security-policy"]).not.toContain(nonce);
    const unstamped = await page.evaluate(
      () => [...document.querySelectorAll("script")].filter((s) => !s.nonce).length,
    );
    expect(unstamped).toBe(0);
    // The page hydrated under the policy (the form is interactive).
    await page.getByLabel("Email").fill("x@example.test");
    await expect(page.getByLabel("Email")).toHaveValue("x@example.test");
  });
});
