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

describe('Booking overlap and adjacency (database-level)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows adjacent bookings that touch but do not overlap', async () => {
    const { room, user } = await createRoomAndUser();

    await prisma.booking.create({
      data: {
        title: 'First',
        startAt: new Date('2027-01-04T10:00:00.000Z'),
        endAt: new Date('2027-01-04T11:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Second',
          startAt: new Date('2027-01-04T11:00:00.000Z'),
          endAt: new Date('2027-01-04T12:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).resolves.toBeDefined();
  });

  it('rejects a booking that partially overlaps an existing active booking', async () => {
    const { room, user } = await createRoomAndUser();

    await prisma.booking.create({
      data: {
        title: 'First',
        startAt: new Date('2027-01-05T10:00:00.000Z'),
        endAt: new Date('2027-01-05T11:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Overlapping',
          startAt: new Date('2027-01-05T10:30:00.000Z'),
          endAt: new Date('2027-01-05T11:30:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a booking fully contained within an existing active booking', async () => {
    const { room, user } = await createRoomAndUser();

    await prisma.booking.create({
      data: {
        title: 'Outer',
        startAt: new Date('2027-01-06T09:00:00.000Z'),
        endAt: new Date('2027-01-06T13:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Inner',
          startAt: new Date('2027-01-06T10:00:00.000Z'),
          endAt: new Date('2027-01-06T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('does not conflict with a booking on a neighboring day at the same clock time', async () => {
    const { room, user } = await createRoomAndUser();

    await prisma.booking.create({
      data: {
        title: 'Day One',
        startAt: new Date('2027-01-07T10:00:00.000Z'),
        endAt: new Date('2027-01-07T11:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Day Two',
          startAt: new Date('2027-01-08T10:00:00.000Z'),
          endAt: new Date('2027-01-08T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).resolves.toBeDefined();
  });

  it('lets a new booking take a slot once the conflicting booking is cancelled', async () => {
    const { room, user } = await createRoomAndUser();

    const original = await prisma.booking.create({
      data: {
        title: 'Original',
        startAt: new Date('2027-01-09T10:00:00.000Z'),
        endAt: new Date('2027-01-09T11:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Blocked',
          startAt: new Date('2027-01-09T10:00:00.000Z'),
          endAt: new Date('2027-01-09T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).rejects.toThrow();

    await prisma.booking.update({
      where: { id: original.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await expect(
      prisma.booking.create({
        data: {
          title: 'Now allowed',
          startAt: new Date('2027-01-09T10:00:00.000Z'),
          endAt: new Date('2027-01-09T11:00:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      }),
    ).resolves.toBeDefined();
  });
});
