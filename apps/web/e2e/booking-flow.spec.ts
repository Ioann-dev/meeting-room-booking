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
// Selecting Start leaves the form's own default End (Start + 30 minutes)
// in place, so only the start time needs to be spelled out here.
const PROJECT_START_LABEL: Record<string, string> = {
  'Desktop Chrome': '09:00',
  'Mobile 390x844': '10:30',
  'Mobile 430': '12:00',
};

test.describe('Booking flow smoke', () => {
  test('create, deep-link from My Bookings, then cancel', async ({ page }, testInfo) => {
    const startLabel = PROJECT_START_LABEL[testInfo.project.name];
    if (!startLabel) {
      throw new Error(`No configured slot for Playwright project "${testInfo.project.name}"`);
    }
    const title = `QA Smoke ${testInfo.project.name} ${Date.now()}`;

    await page.goto('/schedule');
    await page.getByRole('link', { name: /Florence/ }).click();
    await expect(page.getByRole('heading', { name: 'Florence' })).toBeVisible();
    await page.getByRole('button', { name: 'Next week' }).click();

    await page.getByRole('button', { name: 'Book a room' }).click();
    await page.getByLabel('Start').selectOption({ label: startLabel });
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
