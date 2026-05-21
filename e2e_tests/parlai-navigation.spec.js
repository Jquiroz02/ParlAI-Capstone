import { test, expect } from '@playwright/test';

test.describe('ParlAI E2E Tests', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check that the homepage loads (title from index.html)
    await expect(page).toHaveTitle(/frontend/i);
  });

  test('navigation to soccer page works', async ({ page }) => {
    await page.goto('/');

    // Navigate to soccer page
    await page.click('text=Soccer');
    await expect(page).toHaveURL(/soccer/);
  });

  test('navigation to NFL page works', async ({ page }) => {
    await page.goto('/');

    // Navigate to NFL page
    await page.click('text=NFL');
    await expect(page).toHaveURL(/nfl/);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('how-to-play page loads', async ({ page }) => {
    await page.goto('/how-to-play');
    await expect(
      page.getByRole('heading', { name: 'How to Play' }),
    ).toBeVisible();
  });
});
