import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';

test.describe('Auth pages accessibility', () => {
  test('login page has no serious a11y violations', async ({ page }) => {
    await page.goto('/login');
    await expectNoSeriousA11yViolations(page);
  });

  test('register page has no serious a11y violations', async ({ page }) => {
    await page.goto('/register');
    await expectNoSeriousA11yViolations(page);
  });
});
