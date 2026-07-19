import { test, expect } from '@playwright/test';

test('renders the demo bundle with semantic tabs', async ({ page }) => {
  await page.goto('/');

  // The demo bundle (ERC-20 + Ownable + Pausable) loads and identifies itself.
  await expect(page.getByRole('heading', { name: 'DemoToken', level: 1 })).toBeVisible();
  await expect(page.getByText(/demo bundle/)).toBeVisible();

  // Semantic tabs appear (ERC-20 → User, Ownable → Admin, Pausable → Emergency)
  // plus the always-present lossless Raw tab.
  await expect(page.getByRole('tab', { name: /User/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Raw/ })).toBeVisible();

  // The Raw tab lists every function losslessly.
  await page.getByRole('tab', { name: /Raw/ }).click();
  await expect(page.getByText('transfer(address,uint256)').first()).toBeVisible();
});
