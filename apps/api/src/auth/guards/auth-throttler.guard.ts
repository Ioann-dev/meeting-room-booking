import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { canonicalizeEmail } from 'shared';

/**
 * Keys the login/register throttle by the submitted email rather than the
 * default req.ip. apps/web proxies /api/* through Next's own rewrites(),
 * not a dedicated reverse proxy that adds or strips X-Forwarded-For itself
 * (see docs/architecture.md) -- so a client-supplied X-Forwarded-For header
 * passes through to this service completely unmodified, and `trust proxy`
 * (main.ts) cannot tell it apart from a genuine one. IP-based tracking
 * under that topology is both trivially spoofable (rotate the header,
 * bypass the limit entirely) and prone to collapsing every real user
 * behind the same web process into one shared bucket, so one busy or
 * malicious client can lock everyone else out. Keying on the account
 * actually being attempted sidesteps both problems at once: it rate-limits
 * credential-guessing against a given account regardless of the caller's
 * claimed network identity, and two different users' attempts never
 * collide with each other no matter what either client's headers say.
 */
export function authRateLimitTracker(req: Record<string, unknown>): string {
  const body = req.body as Record<string, unknown> | undefined;
  const email = typeof body?.email === 'string' ? canonicalizeEmail(body.email) : 'unknown';
  return `auth:${email}`;
}

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(authRateLimitTracker(req));
  }
}
