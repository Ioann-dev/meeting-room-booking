import { expect, test } from '@playwright/test';
import { ALICE_STORAGE_STATE_PATH } from './helpers';

test.use({ storageState: ALICE_STORAGE_STATE_PATH });

// Florence carries no seed bookings (see apps/api/prisma/seed.ts), and "next
// week" from whenever this runs is always entirely in the future -- together
// that means every run gets a clean, collision-free room/day without needing
// to duplicate the app's own office-hours/DST arithmetic here. Each project
// gets its own time-of-day so the three Playwright projects (which run this
// spec in parallel against the same dev database) never race for the same
// slot.
// Selected by index into the Start dropdown, not by option label: the
// label's primary time is the resolved viewer zone (see
// booking-create-dialog.helpers.ts), which depends on whatever timezone the
// test browser itself resolves to (the host machine's default, absent an
// explicit Playwright `timezoneId`) -- the option *order* is always the
// same fixed sequence of Kyiv office-hour boundaries regardless of display
// zone, so indexing into it is the only viewer-zone-independent way to pick
// a specific, deterministic slot here.
// Selecting Start leaves the form's own default End (Start + 30 minutes)
// in place, so only the start index needs to be spelled out here.
const PROJECT_START_INDEX: Record<string, number> = {
  'Desktop Chrome': 0, // 09:00 Kyiv
  'Mobile 390x844': 3, // 10:30 Kyiv
  'Mobile 430': 6, // 12:00 Kyiv
};

test.describe('Booking flow smoke', () => {
  test('create, deep-link from My Bookings, then cancel', async ({ page }, testInfo) => {
    const startIndex = PROJECT_START_INDEX[testInfo.project.name];
    if (startIndex === undefined) {
      throw new Error(`No configured slot for Playwright project "${testInfo.project.name}"`);
    }
    const title = `QA Smoke ${testInfo.project.name} ${Date.now()}`;

    await page.goto('/schedule');
    await page.getByRole('link', { name: /Florence/ }).click();
    await expect(page.getByRole('heading', { name: 'Florence' })).toBeVisible();
    await page.getByRole('button', { name: 'Next week' }).click();

    await page.getByRole('button', { name: 'Book a room' }).click();
    await page.getByLabel('Start').selectOption({ index: startIndex });
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', { name: 'Book room' }).click();

    await expect(page.getByText(/Booking confirmed/)).toBeVisible();

    const viewport = page.viewportSize();
    const isMobileViewport = viewport !== null && viewport.width < 768;
    if (isMobileViewport) {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }
    await page.getByRole('link', { name: 'My Bookings' }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingLink = page.getByRole('link', { name: new RegExp(title) });
    await expect(bookingLink).toBeVisible();
    await bookingLink.click();

    await expect(page).toHaveURL(/\/schedule\//);
    await expect(page.getByRole('heading', { name: 'Florence' })).toBeVisible();

    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: 'Cancel booking' }).click();
    await page.getByRole('button', { name: 'Cancel booking' }).click();

    await expect(page.getByText('Booking cancelled.')).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(title) })).not.toBeVisible();
  });
});
