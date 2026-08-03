import { generateOpaqueToken, hashToken } from './token.util';

describe('token.util', () => {
  it('generates distinct, URL-safe tokens', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(32);
  });

  it('hashes the same token deterministically', () => {
    const token = generateOpaqueToken();

    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('hashes different tokens to different values', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();

    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});
