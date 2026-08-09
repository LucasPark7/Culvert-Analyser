import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://jhoonings.github.io/Culvert-Analyser/analyse.html');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Culvert Collections/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://jhoonings.github.io/Culvert-Analyser/analyse.html');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
