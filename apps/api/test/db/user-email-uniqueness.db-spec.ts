import { randomUUID } from 'node:crypto';
import { prisma } from './prisma-test-client';

describe('User canonical email uniqueness (database-level)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a second user whose email differs only by case', async () => {
    const unique = randomUUID();
    const email = `Ivan.${unique}@Example.com`;

    await prisma.user.create({
      data: { name: 'Ivan', email, passwordHash: 'hash' },
    });

    await expect(
      prisma.user.create({
        data: { name: 'Ivan Duplicate', email: email.toLowerCase(), passwordHash: 'hash' },
      }),
    ).rejects.toThrow();
  });

  it('allows two users whose emails are genuinely different', async () => {
    const unique = randomUUID();

    await prisma.user.create({
      data: { name: 'User A', email: `a.${unique}@example.com`, passwordHash: 'hash' },
    });

    await expect(
      prisma.user.create({
        data: { name: 'User B', email: `b.${unique}@example.com`, passwordHash: 'hash' },
      }),
    ).resolves.toBeDefined();
  });
});
