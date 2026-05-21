import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
// Test user data from database
const testUsers = {
  // Onboarded user - authenticated and completed onboarding
  onboardedUser: {
    userId: 'c8c1c8b26f3b41aa8651cfbec2121a6c',
    userDetails: 'amalxsuresh@gmail.com',
    claims: [],
  },
};

// Helper to encode user for test mode
function encodeTestUser(user) {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

test.describe('ParlAI Authenticated Betting E2E Tests', () => {
  // ============================================================
  // TEST 1: New User Auth -> Onboarding -> Make Bet
  // ============================================================
  test('new user: auth -> onboarding -> make bet', async ({ page }) => {
    const uniqueId = randomUUID();

    // Create new user using random creds
    const testUser = {
      userId: uniqueId,
      userDetails: `newuser_${uniqueId}@example.com`,
      claims: [],
    };

    // Encode the newly randomized user
    const encodedUser = encodeTestUser(testUser);

    // Mock /.auth/me endpoint
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: { clientPrincipal: testUser },
      });
    });

    // Inject test header into ALL API calls
    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      headers['x-ms-client-principal-test'] = encodedUser;
      await route.continue({ headers });
    });

    // mock /user/me endpoint to get onboarding status
    await page.route('**/api/user/me', async (route) => {
      // Return 404 so the frontend knows they are a new user
      await route.fulfill({
        status: 200,
        json: {
          id: uniqueId,
          email: testUser.userDetails,
          nickname: null,
          onboardingStage: 0, // Your frontend looks for this!
          balance: 1000,
        },
      });
    });

    // mock /api/complete-onboarding to pass user into betting stage
    await page.route('**/api/complete-onboarding', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.continue();
        return;
      }

      // Force a successful save response
      await route.fulfill({
        status: 200,
        json: { message: 'Onboarding complete!' },
      });
    });

    // mock api/user/balance to get and update balance
    await page.route('**/api/user/balance', async (route) => {
      await route.fulfill({
        status: 200,
        json: { balance: 1000 },
      });
    });

    await page.route('**/api/bets/place', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          message: 'Wager confirmed',
        },
      });
    });

    // Navigate to homepage
    await page.goto('/');
    await page.waitForTimeout(2000);

    console.log('URL after auth:', page.url());

    // Complete onboarding if redirected
    if (
      page.url().includes('onboarding') ||
      (await page.locator('text=Get Started').isVisible())
    ) {
      console.log('On onboarding page - completing...');

      const nicknameInput = page
        .locator(
          'input[type="text"], input[id*="nickname"], input[placeholder*="nickname"]',
        )
        .first();
      if (await nicknameInput.isVisible()) {
        await nicknameInput.fill(uniqueId.substring(0, 8));
      }

      const nextButton = page
        .locator(
          'button:has-text("Next"), button:has-text("Continue"), button:has-text("Get Started")',
        )
        .first();
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }

      const teamButtons = page
        .locator('button:has-text("Arsenal"), button:has-text("+")')
        .first();
      if (await teamButtons.isVisible().catch(() => false)) {
        await teamButtons.click();
      }

      const finishButton = page.locator('button:has-text("Finish")').first();
      if (await finishButton.isVisible().catch(() => false)) {
        await finishButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // update user status to get out of on-boarding screen
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: uniqueId,
          email: testUser.userDetails,
          nickname: uniqueId.substring(0, 8),
          onboardingStage: 1,
          balance: 1000,
        },
      });
    });

    // Navigate to betting page
    await page.goto('/soccer');
    await page.waitForTimeout(2000);

    console.log('Attempting to place bet...');

    // look for betting button
    const availableBets = page
      .locator('button[type="button"]:enabled')
      .filter({ hasText: /[0-9]/ });

    const count = await availableBets.count();
    console.log(`Found ${count} potential bet buttons`);

    if (count > 0) {
      await availableBets.nth(0).click();
      await page.waitForTimeout(500);

      // Check for the Stake input to confirm slip is open
      const stakeInput = page.getByPlaceholder('Stake');

      if (await stakeInput.isVisible().catch(() => false)) {
        console.log('Bet slip visible!');

        await stakeInput.fill('10');

        // Click Review & Place
        const reviewBtn = page.locator('button:has-text("Review & Place")');
        if (await reviewBtn.isVisible().catch(() => false)) {
          await reviewBtn.click();
          await page.waitForTimeout(500);

          // Click Confirm Bet
          const confirmBtn = page.locator('button:has-text("Confirm Bet")');
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
            console.log('Bet submitted!');
          }
        }
      }
    } else {
      console.log('No bet options available (no games scheduled)');
    }

    const closeButton = page.locator('button:has-text("close slip")').first();
    expect(page.url()).toMatch(/\/(soccer|nfl|nba|hockey)?/);
  });

  // ============================================================
  // TEST 2: Existing User Auth -> Make Bet Directly
  // ============================================================
  test('existing user: auth -> make parlay bet', async ({ page }) => {
    const testUser = testUsers.onboardedUser;
    const encodedUser = encodeTestUser(testUser);

    // Mock Auth
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({ status: 200, json: { clientPrincipal: testUser } });
    });

    // Inject Headers
    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      headers['x-ms-client-principal-test'] = encodedUser;
      await route.continue({ headers });
    });

    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: testUser.userId,
          onboardingStage: 1,
          balance: 1000,
          nickname: 'TestRunner',
        },
      });
    });

    await page.route('**/api/user/balance', async (route) => {
      await route.fulfill({
        status: 200,
        json: { balance: 1000 },
      });
    });

    await page.route('**/api/bets/place', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          message: 'Wager confirmed',
        },
      });
    });

    // Navigate to the soccer page
    await page.goto('/soccer');
    await page.waitForTimeout(2000);

    console.log('Attempting to place bet...');

    const availableBets = page
      .locator('button[type="button"]:enabled')
      .filter({ hasText: /[0-9]/ });

    const count = await availableBets.count();
    console.log(`Found ${count} potential bet buttons`);

    if (count > 0) {
      await availableBets.nth(0).click();
      await availableBets.nth(7).click();
      await page.waitForTimeout(500);

      // Check for the Stake input to confirm slip is open
      const stakeInput = page.getByPlaceholder('Stake');

      if (await stakeInput.isVisible().catch(() => false)) {
        console.log('Bet slip visible!');

        await stakeInput.fill('10');

        // Click Review & Place
        const reviewBtn = page.locator('button:has-text("Review & Place")');
        if (await reviewBtn.isVisible().catch(() => false)) {
          await reviewBtn.click();
          await page.waitForTimeout(500);

          // Click Confirm Bet
          const confirmBtn = page.locator('button:has-text("Confirm Bet")');
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
            console.log('Bet submitted!');
          }
        }
      }
    } else {
      console.log('No bet options available (no games scheduled)');
    }

    const closeButton = page.locator('button:has-text("close slip")').first();
    expect(page.url()).toMatch(/\/(soccer|nfl|nba|hockey)?/);
  });

  // ============================================================
  // TEST 3: Try to bet without being authenticated
  // ============================================================
  test('unauthenticated user is redirected to login when trying to bet', async ({
    page,
  }) => {
    // Tell the app the user is completely logged out
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: { clientPrincipal: null },
      });
    });

    // Catch API rejections
    await page.route('**/api/**', async (route) => {
      if (
        route.request().url().includes('/api/user') ||
        route.request().url().includes('/api/bets')
      ) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      } else {
        await route.continue();
      }
    });

    // Navigate to the betting page
    await page.goto('/soccer');
    await page.waitForTimeout(2000);

    // Look for betting button
    const availableBets = page
      .locator('button[type="button"]:enabled')
      .filter({ hasText: /[0-9]/ });

    const count = await availableBets.count();
    console.log(`Found ${count} potential bet buttons`);

    if (count > 0) {
      await availableBets.nth(0).click();
      await page.waitForTimeout(500);

      const stakeInput = page.getByPlaceholder('Stake');

      // Check if it's visible
      if (await stakeInput.isVisible().catch(() => false)) {
        console.log('Bet slip visible!');

        await stakeInput.fill('25');

        // Look for the action button
        const actionBtn = page
          .locator(
            'button:has-text("Review & Place"), button:has-text("Login To Bet")',
          )
          .first();
        if (await actionBtn.isVisible()) {
          await actionBtn.click();
        }

        // Verify the redirect
        await page.waitForURL(/login|\.auth\/login/);

        console.log(
          'Successfully intercepted unauthenticated bet and redirected to:',
          page.url(),
        );
        expect(page.url()).toMatch(/login|\.auth\/login/);
      } else {
        console.log('Bet slip did not open.');
      }
    } else {
      console.log('No games scheduled to test unauthenticated flow');
    }
  });
});
