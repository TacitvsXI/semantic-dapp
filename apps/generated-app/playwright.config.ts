import { defineConfig } from '@playwright/test';

/**
 * Minimal E2E smoke config. Assumes the app has been built (`pnpm build`);
 * serves the production preview and checks the default demo bundle renders. No
 * chain is required — reads fail gracefully so the generated UI still renders.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4174',
  },
  webServer: {
    command: 'pnpm run preview',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
