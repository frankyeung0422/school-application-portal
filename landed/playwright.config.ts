import { defineConfig } from "@playwright/test";

// Runs against the dev DB seeded with `npm run seed -- --demo`. Money flows are
// covered keyless (and faster) by `npm run verify:flows`; these specs check the
// real browser surface.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:6565", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:6565/login", reuseExistingServer: true, timeout: 120_000 },
});
