import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate: the rendered demo app must have no serious/critical axe
 * violations. Runs against the default demo bundle on the main tabs. Keeps a11y
 * a build gate rather than a one-off manual pass (ADR-010).
 */
async function scan(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

const blocking = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

test('User tab has no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'DemoToken', level: 1 })).toBeVisible();

  const results = await scan(page);
  const serious = blocking(results.violations);
  expect(
    serious,
    JSON.stringify(
      serious.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      null,
      2,
    ),
  ).toEqual([]);
});

test('Raw tab has no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Raw/ }).click();
  await expect(page.getByText('transfer(address,uint256)').first()).toBeVisible();

  const results = await scan(page);
  const serious = blocking(results.violations);
  expect(
    serious,
    JSON.stringify(
      serious.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      null,
      2,
    ),
  ).toEqual([]);
});
