import { expect, test } from '@playwright/test';
import { ALICE_STORAGE_STATE_PATH } from './helpers';

const MIN_TOUCH_TARGET_PX = 44;

test.use({ storageState: ALICE_STORAGE_STATE_PATH });

test.describe('Mobile touch targets', () => {
  test('booking-form controls meet the 44px minimum below the md breakpoint', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      viewport === null || viewport.width >= 768,
      'Desktop density is intentionally tighter',
    );

    await page.goto('/schedule');
    await page.getByRole('link', { name: /Florence/ }).click();
    await page.getByRole('button', { name: 'Book a room' }).click();

    const controls = [
      page.getByLabel('Date'),
      page.getByLabel('Start'),
      page.getByLabel('End'),
      page.getByLabel('Title'),
      page.getByLabel('Repeat weekly'),
    ];
    for (const control of controls) {
      // Repeat weekly's own tappable area is the surrounding <label>, not
      // the small checkbox input itself.
      const target =
        (await control.evaluate((el) => el.tagName)) === 'INPUT' &&
        (await control.getAttribute('type')) === 'checkbox'
          ? control.locator('xpath=..')
          : control;
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    }
  });
});
