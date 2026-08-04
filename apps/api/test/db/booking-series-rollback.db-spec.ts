import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { generateWeeklyOccurrences } from 'shared';
import { prisma } from './prisma-test-client';
import { BookingService } from '../../src/booking/booking.service';
import { CreateBookingDto } from '../../src/booking/dto/create-booking.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthenticatedUser } from '../../src/auth/auth.service';

async function createRoomAndUser(): Promise<{
  room: { id: string };
  user: AuthenticatedUser;
}> {
  const unique = randomUUID();
  const room = await prisma.room.create({
    data: { name: `Rollback Test Room ${unique}`, floor: 1, capacity: 4 },
  });
  const user = await prisma.user.create({
    data: {
      name: 'Rollback Test User',
      email: `rollback.${unique}@example.com`,
      passwordHash: 'hash',
      emailVerifiedAt: new Date(),
    },
  });
  return {
    room,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  };
}

// Forces BookingService.createSeries past its application-level pre-check
// regardless of what's actually in the database, so every test below
// deterministically exercises the real Postgres transaction and its
// EXCLUDE-constraint-triggered ROLLBACK -- the path the application-level
// pre-check normally shields, and which the pre-check's own coverage
// (booking.service.spec.ts, booking.e2e-spec.ts) does not reach. Every
// other Prisma call goes straight through to the real client, so the
// series-row insert, every occurrence insert, the exclusion-constraint
// violation, and the rollback are all real.
//
// eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment --
// ProxyHandler's own type declarations return `any` for every trap; there
// is no type-safe way to write a generic pass-through Proxy in TypeScript.
function createBlindPreCheckService(): BookingService {
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  const blindPrisma = new Proxy(prisma, {
    get(target, prop, receiver) {
      if (prop === 'booking') {
        const bookingDelegate = Reflect.get(target, prop, receiver);
        return new Proxy(bookingDelegate, {
          get(bookingTarget, bookingProp, bookingReceiver) {
            if (bookingProp === 'findMany') {
              return () => Promise.resolve([]);
            }
            return Reflect.get(bookingTarget, bookingProp, bookingReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  /* eslint-enable @typescript-eslint/no-unsafe-return */
  return new BookingService(blindPrisma as unknown as PrismaService);
}

function buildSeriesDto(roomId: string, occurrenceCount: number): CreateBookingDto {
  const dto = new CreateBookingDto();
  dto.title = 'Rollback Probe Series';
  dto.roomId = roomId;
  dto.startAt = '2098-04-07T06:00:00.000Z'; // Tue 09:00 Kyiv, far future, EEST
  dto.endAt = '2098-04-07T06:30:00.000Z';
  dto.recurrence = { occurrenceCount };
  return dto;
}

describe('Series creation transactional rollback (database-level)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([
    ['the first', 0],
    ['a middle', 2],
    ['the last', 4],
  ])('rolls back the entire series when %s occurrence conflicts', async (_label, conflictIndex) => {
    const { room, user } = await createRoomAndUser();
    const occurrenceCount = 5;
    const dto = buildSeriesDto(room.id, occurrenceCount);

    // Real, already-committed conflicting booking at exactly the
    // targeted occurrence's slot, seeded via the unwrapped client so it
    // is genuinely present when the transaction's insert for that
    // occurrence runs.
    const occurrences = generateWeeklyOccurrences(dto.startAt, dto.endAt, occurrenceCount);
    const target = occurrences[conflictIndex]!;
    await prisma.booking.create({
      data: {
        title: 'Pre-existing blocker',
        startAt: new Date(target.startUtc),
        endAt: new Date(target.endUtc),
        roomId: room.id,
        userId: user.id,
      },
    });

    const service = createBlindPreCheckService();

    const rejection = service.createSeries(dto, dto.recurrence!, user);
    await expect(rejection).rejects.toBeInstanceOf(ConflictException);
    await rejection.catch((error: ConflictException) => {
      expect(error.getResponse()).toMatchObject({
        code: 'SERIES_CONFLICT',
        conflictingOccurrenceIndex: conflictIndex,
      });
    });

    const seriesRows = await prisma.bookingSeries.count({ where: { roomId: room.id } });
    // Only the pre-existing single blocking booking should remain -- no
    // occurrence of the attempted series, regardless of how many were
    // inserted before the transaction hit the conflicting one.
    const seriesBookingRows = await prisma.booking.count({
      where: { roomId: room.id, title: 'Rollback Probe Series' },
    });
    const blockerRows = await prisma.booking.count({
      where: { roomId: room.id, title: 'Pre-existing blocker' },
    });

    expect(seriesRows).toBe(0);
    expect(seriesBookingRows).toBe(0);
    expect(blockerRows).toBe(1);
  });
});
