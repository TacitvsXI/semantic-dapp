import { test } from '@playwright/test';
import { resolve } from 'node:path';
import { erc20AbiJson } from './erc20.abi.js';

const DEMO_DIR = resolve(process.cwd(), '../../docs/demo');

/**
 * Not part of CI. Run locally with `CAPTURE=1` to regenerate demo images:
 *   CAPTURE=1 pnpm --filter @semantic-dapp/studio test:e2e capture
 */
test('capture demo screenshots', async ({ page }) => {
  test.skip(!process.env.CAPTURE, 'screenshot capture is opt-in (set CAPTURE=1)');

  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/');

  await page.getByRole('button', { name: '+ New import' }).click();
  await page.getByPlaceholder('My Token').fill('Fixture Token');
  await page.locator('textarea').fill(erc20AbiJson);
  await page.getByPlaceholder('http://127.0.0.1:8545').fill('http://127.0.0.1:8545');
  await page.screenshot({ path: resolve(DEMO_DIR, 'import-wizard.png'), fullPage: true });

  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('tab', { name: /User/ }).click();
  await page.screenshot({ path: resolve(DEMO_DIR, 'generated-app.png'), fullPage: true });

  await page.getByRole('tab', { name: /Raw/ }).click();
  await page.screenshot({ path: resolve(DEMO_DIR, 'raw-tab.png'), fullPage: true });
});
