import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build in local mode (embedded PGlite database and
 * dev sign-in), so they need no external services. Supabase-specific auth flows are covered by
 * e2e/supabase-auth.spec.ts, which only runs when E2E_SUPABASE=1 and credentials are configured.
 *
 * PLAYWRIGHT_CHROMIUM_PATH / PLAYWRIGHT_LAUNCH_ARGS let restricted environments supply their own
 * Chromium binary; normally `npx playwright install chromium` is enough.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const args = process.env.PLAYWRIGHT_LAUNCH_ARGS
  ? process.env.PLAYWRIGHT_LAUNCH_ARGS.split(" ").filter(Boolean)
  : [];

export default defineConfig({
  testDir: "./e2e",
  testIgnore: /static\..*spec\.ts/,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1400, height: 860 },
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    launchOptions: { executablePath, args },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 860 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      GAME_BACKEND: "local",
      LOCAL_DATA_DIR: ".data/e2e",
      NEXT_PUBLIC_E2E_HOOKS: "1",
      NEXT_PUBLIC_GAME_DEBUG: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
    },
  },
});
