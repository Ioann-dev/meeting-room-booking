import { expect, test } from '@playwright/test';
import { ALICE_STORAGE_STATE_PATH } from './helpers';

test.use({ storageState: ALICE_STORAGE_STATE_PATH });

test.describe('Mobile notification bell', () => {
  test('the notification bell is reachable without opening the hamburger menu', async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    test.skip(
      viewport === null || viewport.width >= 768,
      'The mobile-only bell placement only applies below the md breakpoint (see app-header.tsx)',
    );

    await page.goto('/schedule');

    const bell = page.getByRole('button', { name: /Notifications/ });
    await expect(bell).toBeVisible();

    await bell.click();
    await expect(page.getByText(/Notifications/i).first()).toBeVisible();
  });
});
