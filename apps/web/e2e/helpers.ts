import type { Page } from '@playwright/test';

// Seeded, already-verified test user (see README's "Test users" table).
export const SEEDED_USER = { email: 'alice@example.com', password: 'AlicePassword123' };

export async function loginAsSeededUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(SEEDED_USER.email);
  await page.getByLabel('Password').fill(SEEDED_USER.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/schedule');
}
