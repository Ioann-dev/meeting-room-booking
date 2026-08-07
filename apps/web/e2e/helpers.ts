// Seeded, already-verified test user (see README's "Test users" table).
export const SEEDED_USER = { email: 'alice@example.com', password: 'AlicePassword123' };

// Written once by global-setup.ts; authenticated specs load it via
// `test.use({ storageState: ALICE_STORAGE_STATE_PATH })` instead of each
// independently driving the login form (see global-setup.ts's own
// comment for why that matters beyond just speed).
export const ALICE_STORAGE_STATE_PATH = 'e2e/.auth/alice.json';
