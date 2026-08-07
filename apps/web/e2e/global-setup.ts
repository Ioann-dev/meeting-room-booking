import { request } from '@playwright/test';
import { SEEDED_USER, ALICE_STORAGE_STATE_PATH } from './helpers';

// Logs in once, via a direct API call (no UI driving needed for this),
// and persists the resulting session cookie so every authenticated spec
// can start already-logged-in via `test.use({ storageState: ... })`
// instead of repeating the full UI login flow itself. Beyond being
// faster, this also avoids every spec independently re-authenticating as
// the same seeded account: with AuthThrottlerGuard now keying the
// login/register rate limit by account (see apps/api/src/auth/guards/
// auth-throttler.guard.ts), a dozen-plus real UI logins for the same
// email across parallel projects/spec files was enough to legitimately
// trip the same limit that guards against credential stuffing.
export default async function globalSetup(): Promise<void> {
  const context = await request.newContext({ baseURL: 'http://localhost:3000' });
  await context.post('/api/auth/login', { data: SEEDED_USER });
  await context.storageState({ path: ALICE_STORAGE_STATE_PATH });
  await context.dispose();
}
