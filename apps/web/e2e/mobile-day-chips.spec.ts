import { expect, test } from '@playwright/test';
import { ALICE_STORAGE_STATE_PATH } from './helpers';

test.use({ storageState: ALICE_STORAGE_STATE_PATH });

test.describe('Mobile day-chip navigation', () => {
  test('tapping a non-adjacent day chip scrolls directly to that day', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      viewport === null || viewport.width >= 640,
      'Day chips only render below the sm breakpoint (see weekly-grid.tsx: sm:hidden)',
    );

    await page.goto('/schedule');
    await page.getByRole('link', { name: /Florence/ }).click();
    await expect(page.getByRole('heading', { name: 'Florence' })).toBeVisible();

    const dayChips = page.getByRole('group', { name: 'Select day' });
    const chips = dayChips.getByRole('button');
    await expect(chips).toHaveCount(7);

    // Jump from whichever day is initially active (today, or Monday if
    // today falls outside the displayed week) directly to the opposite
    // end of the week -- a jump of several days, not the single adjacent
    // step that could mask a coordinate-system bug in the scroll target
    // (see weekly-grid.tsx's scrollToDay: a day <th>'s offsetLeft has to
    // be measured against the scroll wrapper itself, not against
    // whatever positioned ancestor happens to be further up the tree).
    const activeIndexBefore = await chips.evaluateAll((buttons) =>
      buttons.findIndex((button) => button.getAttribute('aria-current') === 'date'),
    );
    expect(activeIndexBefore).toBeGreaterThanOrEqual(0);
    const targetIndex = activeIndexBefore < 3 ? 6 : 0;

    await chips.nth(targetIndex).click();

    await expect(chips.nth(targetIndex)).toHaveAttribute('aria-current', 'date');
    await expect(chips.nth(activeIndexBefore)).not.toHaveAttribute('aria-current', 'date');

    // Cross-check the actual scroll geometry independently of the app's
    // own offsetLeft-based math, using getBoundingClientRect deltas
    // instead -- the target day's header should settle at (or very near)
    // the left edge of the scroll wrapper's visible area. Polled, not a
    // single immediate read: scrollTo's `behavior: 'smooth'` animates over
    // a real duration, so the geometry only converges a short time after
    // the click, especially under parallel test-worker load.
    await expect
      .poll(
        () =>
          page.evaluate((index) => {
            const table = document.querySelectorAll('table')[1];
            const th = table?.querySelectorAll('th[scope="col"]')[index] as HTMLElement | undefined;
            const wrapper = th?.closest('.overflow-x-auto') as HTMLElement | undefined;
            if (!th || !wrapper) {
              return null;
            }
            return Math.abs(th.getBoundingClientRect().left - wrapper.getBoundingClientRect().left);
          }, targetIndex),
        { timeout: 2000 },
      )
      .toBeLessThan(4);
  });
});
