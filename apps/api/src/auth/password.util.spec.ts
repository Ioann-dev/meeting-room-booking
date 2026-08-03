import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes with argon2id and verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects a wrong password against the hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(verifyPassword(hash, 'not the password')).resolves.toBe(false);
  });

  it('never produces the same hash twice for the same password (random salt)', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ]);

    expect(first).not.toBe(second);
  });
});
