import { test, expect } from '@playwright/test';
import { erc20AbiJson } from './erc20.abi.js';

test('import an ERC-20 ABI and generate User/Raw tabs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Semantic Dapp/ })).toBeVisible();

  await page.getByRole('button', { name: '+ New import' }).click();

  await page.getByPlaceholder('My Token').fill('Smoke Token');
  await page.locator('textarea').fill(erc20AbiJson);
  await page.getByPlaceholder('http://127.0.0.1:8545').fill('http://127.0.0.1:8545');

  await page.getByRole('button', { name: 'Create project' }).click();

  // Semantic tabs appear (ERC-20 detected → User tab), plus the lossless Raw tab.
  await expect(page.getByRole('tab', { name: /User/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Raw/ })).toBeVisible();

  // Confidence is surfaced for classified operations.
  await expect(page.getByText(/% confidence/).first()).toBeVisible();

  // The Raw tab lists every function losslessly.
  await page.getByRole('tab', { name: /Raw/ }).click();
  await expect(page.getByText('transfer(address,uint256)').first()).toBeVisible();
});
