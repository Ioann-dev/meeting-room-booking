import { defineConfig, devices } from '@playwright/test';

// A handful of a11y/mobile-viewport smoke flows, not a parallel copy of the
// unit/integration suite (see docs/architecture.md's test-pyramid section).
// Assumes the dev stack (apps/api against a running Postgres, apps/web) is
// already up -- same convention apps/api's own test:e2e/test:db scripts
// already use, rather than trying to orchestrate Postgres+API+web here.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Smallest of the two viewports Phase 11 mandates testing.
      name: 'Mobile 390x844',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'Mobile 430',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 } },
    },
  ],
});
