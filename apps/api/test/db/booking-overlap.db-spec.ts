import { randomUUID } from 'node:crypto';
import { prisma } from './prisma-test-client';
import { isOverlapConstraintViolation } from '../../src/booking/booking.service';

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

  // Regression coverage for a fix: `isOverlapConstraintViolation` (the
  // function booking.service.ts uses to map a database-level conflict to a
  // 409) previously checked `error.meta.constraint`, a field this
  // driver/Prisma version never populates -- so the check was silently
  // dead code that a fabricated unit-test fixture didn't catch. This test
  // triggers a *real* exclusion-constraint violation against Postgres and
  // feeds the *actual* caught error straight into the production function,
  // with no fabricated shape anywhere in the chain.
  it('isOverlapConstraintViolation recognizes a real 23P01 raised by the exclusion constraint', async () => {
    const { room, user } = await createRoomAndUser();

    await prisma.booking.create({
      data: {
        title: 'First',
        startAt: new Date('2027-01-10T10:00:00.000Z'),
        endAt: new Date('2027-01-10T11:00:00.000Z'),
        roomId: room.id,
        userId: user.id,
      },
    });

    let caught: unknown;
    try {
      await prisma.booking.create({
        data: {
          title: 'Conflict',
          startAt: new Date('2027-01-10T10:30:00.000Z'),
          endAt: new Date('2027-01-10T11:30:00.000Z'),
          roomId: room.id,
          userId: user.id,
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(isOverlapConstraintViolation(caught)).toBe(true);
  });

  it('isOverlapConstraintViolation does not misclassify an unrelated constraint violation', async () => {
    const { room } = await createRoomAndUser();

    let caught: unknown;
    try {
      // A duplicate room name violates Room's own unique constraint --
      // nothing to do with the booking exclusion constraint.
      await prisma.room.create({ data: { name: room.name, floor: 2, capacity: 8 } });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(isOverlapConstraintViolation(caught)).toBe(false);
  });
});
