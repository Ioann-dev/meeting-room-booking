import { randomUUID } from 'node:crypto';
import { prisma } from './prisma-test-client';

async function createRoomAndUser() {
  const unique = randomUUID();
  const room = await prisma.room.create({
    data: { name: `Test Room ${unique}`, floor: 1, capacity: 4 },
  });
  const user = await prisma.user.create({
    data: { name: 'Test User', email: `user.${unique}@example.com`, passwordHash: 'hash' },
  });
  return { room, user };
}

describe('Booking status/cancelledAt consistency (database-level)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a CANCELLED booking with no cancelledAt', async () => {
    const { room, user } = await createRoomAndUser();

    await expect(
      prisma.booking.create({
        data: {
          title: 'Inconsistent',
          startAt: new Date('2027-03-01T10:00:00.000Z'),
          endAt: new Date('2027-03-01T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
          status: 'CANCELLED',
          cancelledAt: null,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects an ACTIVE booking that already has a cancelledAt', async () => {
    const { room, user } = await createRoomAndUser();

    await expect(
      prisma.booking.create({
        data: {
          title: 'Inconsistent',
          startAt: new Date('2027-03-02T10:00:00.000Z'),
          endAt: new Date('2027-03-02T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
          status: 'ACTIVE',
          cancelledAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it('allows a CANCELLED booking with a cancelledAt set', async () => {
    const { room, user } = await createRoomAndUser();

    await expect(
      prisma.booking.create({
        data: {
          title: 'Consistent',
          startAt: new Date('2027-03-03T10:00:00.000Z'),
          endAt: new Date('2027-03-03T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      }),
    ).resolves.toBeDefined();
  });
});
