import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';
import { loginAsSeededUser } from './helpers';

test.describe('Room schedule accessibility', () => {
  test('a populated room schedule has no serious a11y violations', async ({ page }) => {
    await loginAsSeededUser(page);
    // Athens carries seeded demo bookings (own and other-user), so this
    // exercises BookingBlock's real markup, not an empty grid.
    await page.getByRole('link', { name: /Athens/ }).click();
    await expect(page.getByRole('heading', { name: 'Athens' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations(page);
  });
});
