import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the static (GitHub Pages) edition: builds `out/` once and serves it with a plain
 * static file server under a sub-path, like a GitHub project page — no Next.js server, no API.
 */
const PORT = Number(process.env.E2E_STATIC_PORT ?? 4173);
// Served under an arbitrary sub-path: the build itself knows nothing about it (path-independent).
const BASE = process.env.E2E_STATIC_BASE ?? "/any-repo-name";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const args = process.env.PLAYWRIGHT_LAUNCH_ARGS
  ? process.env.PLAYWRIGHT_LAUNCH_ARGS.split(" ").filter(Boolean)
  : [];

export default defineConfig({
  testDir: "./e2e",
  testMatch: /static\..*spec\.ts/,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-static" }]]
    : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}/`,
    viewport: { width: 1400, height: 860 },
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    acceptDownloads: true,
    launchOptions: { executablePath, args },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 860 } } },
  ],
  webServer: {
    command: `node scripts/static.mjs build && node scripts/static.mjs preview`,
    url: `http://localhost:${PORT}${BASE}/`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      SERVE_BASE: BASE,
      NEXT_PUBLIC_E2E_HOOKS: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
    },
  },
});
