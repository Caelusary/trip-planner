import { defineConfig, devices } from "@playwright/test";

const MOCK_PORT = 54321;
const APP_PORT = 3107;

// The production build is pointed at a local mock of Supabase (see
// e2e/mock-supabase.mjs). NEXT_PUBLIC_* is inlined at build time, so the
// build has to happen here, with these values, not be reused from elsewhere.
const appEnv = {
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
  OPENWEATHER_API_KEY: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "e2e",
  // One mock database shared by every test, reset in beforeEach.
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // Animations off so axe never measures colours mid-fade.
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: [
    {
      command: `node e2e/mock-supabase.mjs`,
      url: `http://127.0.0.1:${MOCK_PORT}/__health`,
      env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/login`,
      env: appEnv,
      // Never reuse: another local app on the same port would answer the tests.
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
