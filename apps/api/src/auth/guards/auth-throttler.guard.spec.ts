import { authRateLimitTracker } from './auth-throttler.guard';

describe('authRateLimitTracker', () => {
  it('keys by the canonicalized (trimmed, lowercased) submitted email', () => {
    expect(authRateLimitTracker({ body: { email: '  Alice@Example.COM  ' } })).toBe(
      'auth:alice@example.com',
    );
  });

  it('is unaffected by a spoofed X-Forwarded-For header -- the tracker never reads req.ip', () => {
    const withSpoofedHeader = { body: { email: 'alice@example.com' }, ip: '10.0.0.99' };
    const withoutHeader = { body: { email: 'alice@example.com' }, ip: '127.0.0.1' };
    expect(authRateLimitTracker(withSpoofedHeader)).toBe(authRateLimitTracker(withoutHeader));
  });

  it('gives two different emails two different tracker keys', () => {
    const alice = authRateLimitTracker({ body: { email: 'alice@example.com' } });
    const bob = authRateLimitTracker({ body: { email: 'bob@example.com' } });
    expect(alice).not.toBe(bob);
  });

  it('falls back to a fixed key when no email is present, rather than throwing', () => {
    expect(authRateLimitTracker({ body: {} })).toBe('auth:unknown');
    expect(authRateLimitTracker({})).toBe('auth:unknown');
  });
});
