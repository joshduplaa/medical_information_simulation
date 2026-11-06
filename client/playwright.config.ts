import { defineConfig, devices } from "@playwright/test";

/**
 * Two projects:
 *  - "api":  the real stack — ASP.NET Core API on a fresh SQLite database (scripts/e2e-api.sh, port 5030)
 *            plus the Vite dev server pointed at it (port 5174).
 *  - "demo": the browser-only demo build (VITE_DEMO_MODE=true, port 5175) with no API at all.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure", ...devices["Desktop Chrome"] },
  projects: [
    { name: "api", testMatch: /core-workflow\.spec\.ts/, use: { baseURL: "http://localhost:5174" } },
    { name: "demo", testMatch: /demo-mode\.spec\.ts/, use: { baseURL: "http://localhost:5175" } },
  ],
  webServer: [
    {
      command: "../scripts/e2e-api.sh",
      url: "http://localhost:5030/api/health",
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "npx vite --port 5174 --strictPort",
      url: "http://localhost:5174",
      env: { VITE_API_BASE_URL: "http://localhost:5030/api", VITE_DEMO_MODE: "false" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npx vite --mode demo --port 5175 --strictPort",
      url: "http://localhost:5175",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
