import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';
import { loginAsSeededUser } from './helpers';

test.describe('My Bookings accessibility', () => {
  test('Upcoming and Past tabs have no serious a11y violations', async ({ page }) => {
    await loginAsSeededUser(page);
    // On mobile viewports the primary nav is hidden (md:hidden / hidden
    // md:flex, see AppHeader) and "My Bookings" is only reachable through
    // the hamburger sheet; on desktop the header link is already visible.
    // Decided from the configured viewport itself (matching the app's own
    // md: breakpoint) rather than an isVisible() probe immediately after
    // navigation, which can race the header's own mount.
    const viewport = page.viewportSize();
    const isMobileViewport = viewport !== null && viewport.width < 768;
    if (isMobileViewport) {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }
    await page.getByRole('link', { name: 'My Bookings' }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations(page);

    await page.getByRole('tab', { name: 'Past' }).click();
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations(page);
  });
});
