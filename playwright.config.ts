import { defineConfig, devices } from "@playwright/test";

// Browser tests for critical user journeys (SW-009). They run against the
// production build, because that's what users get (and `next dev` adds
// dev-only overlays and slower compiles that make tests flaky).
//
//   npm run build && npm run test:e2e
//
// The web server below reuses an already running server on the port, so a
// manual `npx next start -p 3100` also works.

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/dashboard`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
