import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingService, isOverlapConstraintViolation } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { AuthenticatedUser } from '../auth/auth.service';
import { Prisma } from '../../generated/prisma/client';

const REQUESTER: AuthenticatedUser = {
  id: 'user-1',
  name: 'Ivan Test',
  email: 'ivan@example.com',
  emailVerifiedAt: new Date(),
};

// Fixes "now" well before every fixture's 2026-06-01 date, so the
// strictly-future check doesn't depend on when this suite actually runs.
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

function buildDto(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  const dto = new CreateBookingDto();
  dto.title = 'Sprint Planning';
  dto.roomId = 'room-1';
  dto.startAt = '2026-06-01T06:00:00.000Z'; // 09:00 Kyiv
  dto.endAt = '2026-06-01T06:30:00.000Z'; // 09:30 Kyiv
  return Object.assign(dto, overrides);
}

function buildSeriesDto(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  return buildDto({
    startAt: '2026-06-02T06:00:00.000Z', // Tue 09:00 Kyiv
    endAt: '2026-06-02T06:30:00.000Z',
    recurrence: { occurrenceCount: 3 },
    ...overrides,
  });
}

function buildService(overrides: {
  findUniqueRoom?: jest.Mock;
  create?: jest.Mock;
  findManyBooking?: jest.Mock;
  findUniqueBooking?: jest.Mock;
  update?: jest.Mock;
  createSeriesRow?: jest.Mock;
  findUniqueSeries?: jest.Mock;
  updateSeries?: jest.Mock;
  updateManyBooking?: jest.Mock;
  transaction?: jest.Mock;
}) {
  const booking = {
    create:
      overrides.create ??
      jest.fn().mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        title: 'Sprint Planning',
        startAt: new Date('2026-06-01T06:00:00.000Z'),
        endAt: new Date('2026-06-01T06:30:00.000Z'),
        seriesId: null,
        userId: 'user-1',
        user: { name: 'Ivan Test' },
      }),
    findMany: overrides.findManyBooking ?? jest.fn().mockResolvedValue([]),
    findUnique: overrides.findUniqueBooking ?? jest.fn(),
    update: overrides.update ?? jest.fn(),
    updateMany: overrides.updateManyBooking ?? jest.fn().mockResolvedValue({ count: 0 }),
  };
  const bookingSeries = {
    create: overrides.createSeriesRow ?? jest.fn().mockResolvedValue({ id: 'series-1' }),
    findUnique:
      overrides.findUniqueSeries ??
      jest.fn().mockResolvedValue({ id: 'series-1', ownerId: 'user-1', status: 'ACTIVE' }),
    update: overrides.updateSeries ?? jest.fn().mockResolvedValue({}),
  };
  const prismaStub: Record<string, unknown> = {
    room: {
      findUnique: overrides.findUniqueRoom ?? jest.fn().mockResolvedValue({ id: 'room-1' }),
    },
    booking,
    bookingSeries,
  };
  // Mirrors both $transaction call shapes the service uses: an interactive
  // callback (createSeries) and a plain array of already-constructed query
  // promises (cancelSeries). Neither form has real cross-query atomicity
  // here -- that's exactly what the real-Postgres e2e/db-spec tests exist
  // to prove instead.
  prismaStub.$transaction =
    overrides.transaction ??
    jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return (arg as (tx: typeof prismaStub) => Promise<unknown>)(prismaStub);
    });
  return new BookingService(prismaStub as unknown as PrismaService);
}

describe('BookingService.create', () => {
  it('throws NotFoundException when the room does not exist', async () => {
    const service = buildService({ findUniqueRoom: jest.fn().mockResolvedValue(null) });

    await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(NotFoundException);
  });

  it('persists the booking and returns a summary with ownership set', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      title: 'Sprint Planning',
      startAt: new Date('2026-06-01T06:00:00.000Z'),
      endAt: new Date('2026-06-01T06:30:00.000Z'),
      seriesId: null,
      userId: 'user-1',
      user: { name: 'Ivan Test' },
    });
    const service = buildService({ create });

    const result = await service.create(buildDto(), REQUESTER);

    const [callArgs] = create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(callArgs.data).toEqual({
      title: 'Sprint Planning',
      roomId: 'room-1',
      userId: 'user-1',
      startAt: new Date('2026-06-01T06:00:00.000Z'),
      endAt: new Date('2026-06-01T06:30:00.000Z'),
    });
    expect(result).toEqual({
      id: 'booking-1',
      roomId: 'room-1',
      title: 'Sprint Planning',
      startAt: '2026-06-01T06:00:00.000Z',
      endAt: '2026-06-01T06:30:00.000Z',
      authorName: 'Ivan Test',
      isOwnBooking: true,
      seriesId: null,
    });
  });

  describe('slot alignment', () => {
    it('rejects a start time off the 30-minute grid', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:15:00.000Z', endAt: '2026-06-01T06:45:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an end time off the 30-minute grid', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:40:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('duration bounds', () => {
    it('accepts the minimum (30 min) and maximum (4h) durations', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:30:00.000Z' }),
          REQUESTER,
        ),
      ).resolves.toBeDefined();

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T10:00:00.000Z' }),
          REQUESTER,
        ),
      ).resolves.toBeDefined();
    });

    it('rejects a duration below 30 minutes', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:15:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a duration above 4 hours', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T10:01:00.000Z' }),
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('future-only', () => {
    it('rejects a start time in the past relative to the server clock', async () => {
      jest.setSystemTime(new Date('2026-06-02T00:00:00.000Z')); // after the 06-01 fixture
      const service = buildService({});

      await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(BadRequestException);
    });

    it('rejects a start time exactly equal to the current instant', async () => {
      jest.setSystemTime(new Date('2026-06-01T06:00:00.000Z')); // equal to the fixture's startAt
      const service = buildService({});

      await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(BadRequestException);
    });

    it('accepts a start time in the future', async () => {
      const service = buildService({});

      await expect(service.create(buildDto(), REQUESTER)).resolves.toBeDefined();
    });
  });

  describe('office hours', () => {
    it('accepts a booking starting exactly at the opening boundary', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:30:00.000Z' }), // 09:00-09:30 Kyiv
          REQUESTER,
        ),
      ).resolves.toBeDefined();
    });

    it('accepts a booking ending exactly at the closing boundary', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T15:30:00.000Z', endAt: '2026-06-01T16:00:00.000Z' }), // 18:30-19:00 Kyiv
          REQUESTER,
        ),
      ).resolves.toBeDefined();
    });

    it('rejects a booking starting before the office opens', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T05:30:00.000Z', endAt: '2026-06-01T06:30:00.000Z' }), // 08:30-09:30 Kyiv
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a booking ending after the office closes', async () => {
      const service = buildService({});

      await expect(
        service.create(
          buildDto({ startAt: '2026-06-01T15:30:00.000Z', endAt: '2026-06-01T16:30:00.000Z' }), // 18:30-19:30 Kyiv
          REQUESTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('overlap conflict', () => {
    it('rejects when an active booking in the same room overlaps (application pre-check)', async () => {
      const findManyBooking = jest.fn().mockResolvedValue([
        {
          startAt: new Date('2026-06-01T06:15:00.000Z'),
          endAt: new Date('2026-06-01T07:00:00.000Z'),
        },
      ]);
      const service = buildService({ findManyBooking });

      await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(ConflictException);
    });

    it('accepts an adjacent booking that ends exactly when the new one starts', async () => {
      const findManyBooking = jest.fn().mockResolvedValue([
        {
          startAt: new Date('2026-06-01T05:30:00.000Z'),
          endAt: new Date('2026-06-01T06:00:00.000Z'), // ends exactly at the fixture's startAt
        },
      ]);
      const service = buildService({ findManyBooking });

      await expect(service.create(buildDto(), REQUESTER)).resolves.toBeDefined();
    });

    it('bounds the pre-check query to the requested interval instead of loading every active booking', async () => {
      const findManyBooking = jest.fn().mockResolvedValue([]);
      const service = buildService({ findManyBooking });

      await service.create(buildDto(), REQUESTER);

      const [callArgs] = findManyBooking.mock.calls[0] as [
        { where: { roomId: string; status: string; startAt: { lt: Date }; endAt: { gt: Date } } },
      ];
      expect(callArgs.where.roomId).toBe('room-1');
      expect(callArgs.where.status).toBe('ACTIVE');
      expect(callArgs.where.startAt).toEqual({ lt: new Date('2026-06-01T06:30:00.000Z') }); // fixture's endAt
      expect(callArgs.where.endAt).toEqual({ gt: new Date('2026-06-01T06:00:00.000Z') }); // fixture's startAt
    });

    // These fixtures reproduce the *actual* error shape @prisma/adapter-pg
    // (Prisma 7.9.1) raises for the Booking_no_overlap exclusion
    // constraint, captured by directly triggering it against a real
    // Postgres database. Prisma's top-level `.code` is a generic wrapper
    // (P2039) and `.meta.constraint` is never populated by this driver --
    // a fixture built from either of those (as an earlier version of this
    // test was) would pass without proving the real detection logic works.
    // The real SQLSTATE lives at `.meta.driverAdapterError.cause.code`.
    function realPrismaConstraintError(sqlState: '23P01' | '40P01', pgMessage: string) {
      return new Prisma.PrismaClientKnownRequestError(
        `Invalid \`prisma.booking.create()\` invocation\nDatabase error. Code: \`${sqlState}\`. Message: \`${pgMessage}\``,
        {
          code: 'P2039',
          clientVersion: 'test',
          meta: {
            modelName: 'Booking',
            driverAdapterError: {
              name: 'DriverAdapterError',
              cause: {
                originalCode: sqlState,
                originalMessage: pgMessage,
                kind: 'postgres',
                code: sqlState,
                severity: 'ERROR',
                message: pgMessage,
              },
            },
          },
        },
      );
    }

    it('maps a real 23P01 exclusion-constraint violation to a conflict response', async () => {
      const create = jest
        .fn()
        .mockRejectedValue(
          realPrismaConstraintError(
            '23P01',
            'conflicting key value violates exclusion constraint "Booking_no_overlap"',
          ),
        );
      const service = buildService({ create });

      await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(ConflictException);
    });

    it('maps a real 40P01 deadlock (concurrent exclusion-constraint check) to a conflict response', async () => {
      const create = jest
        .fn()
        .mockRejectedValue(realPrismaConstraintError('40P01', 'deadlock detected'));
      const service = buildService({ create });

      await expect(service.create(buildDto(), REQUESTER)).rejects.toThrow(ConflictException);
    });

    it('does not treat an unrelated PrismaClientKnownRequestError as a conflict', async () => {
      const unrelated = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { modelName: 'User', target: ['email'] },
      });
      const create = jest.fn().mockRejectedValue(unrelated);
      const service = buildService({ create });

      await expect(service.create(buildDto(), REQUESTER)).rejects.toBe(unrelated);
    });

    it('rethrows an unrelated database error unchanged', async () => {
      const unrelated = new Error('connection reset');
      const create = jest.fn().mockRejectedValue(unrelated);
      const service = buildService({ create });

      await expect(service.create(buildDto(), REQUESTER)).rejects.toBe(unrelated);
    });
  });
});

describe('isOverlapConstraintViolation', () => {
  it('recognizes the real structured error shape even when the message text gives no hint', () => {
    // Deliberately opaque messages (no "23P01"/"40P01"/"deadlock"/
    // "Booking_no_overlap" substring anywhere) so this can only pass via
    // the structured `meta.driverAdapterError.cause.code` check -- pinning
    // that check specifically, rather than the message-substring fallback.
    const conflict = new Prisma.PrismaClientKnownRequestError('Database error, please retry.', {
      code: 'P2039',
      clientVersion: 'test',
      meta: { driverAdapterError: { cause: { code: '23P01' } } },
    });
    const deadlock = new Prisma.PrismaClientKnownRequestError('Database error, please retry.', {
      code: 'P2039',
      clientVersion: 'test',
      meta: { driverAdapterError: { cause: { code: '40P01' } } },
    });

    expect(isOverlapConstraintViolation(conflict)).toBe(true);
    expect(isOverlapConstraintViolation(deadlock)).toBe(true);
  });

  it('falls back to message content when the structured field is absent', () => {
    const withoutStructuredMeta = new Prisma.PrismaClientKnownRequestError(
      'Database error. Code: `23P01`. Message: `... Booking_no_overlap ...`',
      { code: 'P2039', clientVersion: 'test' },
    );

    expect(isOverlapConstraintViolation(withoutStructuredMeta)).toBe(true);
  });

  it('returns false for an unrelated PrismaClientKnownRequestError', () => {
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { modelName: 'User', target: ['email'] },
    });

    expect(isOverlapConstraintViolation(uniqueViolation)).toBe(false);
  });

  it('returns false for a non-Prisma error', () => {
    expect(isOverlapConstraintViolation(new Error('connection reset'))).toBe(false);
    expect(isOverlapConstraintViolation('not an error')).toBe(false);
    expect(isOverlapConstraintViolation(undefined)).toBe(false);
  });
});

describe('BookingService.getRoomSchedule', () => {
  it('throws NotFoundException when the room does not exist', async () => {
    const service = buildService({ findUniqueRoom: jest.fn().mockResolvedValue(null) });

    await expect(service.getRoomSchedule('missing-room', undefined, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns the office week boundaries and maps ownership per booking', async () => {
    const findManyBooking = jest.fn().mockResolvedValue([
      {
        id: 'booking-own',
        roomId: 'room-1',
        title: 'My Sync',
        startAt: new Date('2026-06-01T06:00:00.000Z'),
        endAt: new Date('2026-06-01T06:30:00.000Z'),
        seriesId: null,
        userId: 'user-1',
        user: { name: 'Ivan Test' },
      },
      {
        id: 'booking-other',
        roomId: 'room-1',
        title: 'Their Sync',
        startAt: new Date('2026-06-02T06:00:00.000Z'),
        endAt: new Date('2026-06-02T06:30:00.000Z'),
        seriesId: null,
        userId: 'user-2',
        user: { name: 'Other User' },
      },
    ]);
    const service = buildService({ findManyBooking });

    const result = await service.getRoomSchedule('room-1', '2026-06-01T10:00:00.000Z', 'user-1');

    expect(result.roomId).toBe('room-1');
    expect(result.weekStartUtc).toBe('2026-05-31T21:00:00.000Z'); // Monday 00:00 Kyiv (EEST)
    expect(result.weekEndUtc).toBe('2026-06-07T21:00:00.000Z');
    expect(result.bookings.map((b) => [b.id, b.isOwnBooking])).toEqual([
      ['booking-own', true],
      ['booking-other', false],
    ]);
  });

  it('queries only active bookings for the room within the resolved week', async () => {
    const findManyBooking = jest.fn().mockResolvedValue([]);
    const service = buildService({ findManyBooking });

    await service.getRoomSchedule('room-1', '2026-06-01T10:00:00.000Z', 'user-1');

    const [callArgs] = findManyBooking.mock.calls[0] as [
      { where: { roomId: string; status: string } },
    ];
    expect(callArgs.where.roomId).toBe('room-1');
    expect(callArgs.where.status).toBe('ACTIVE');
  });
});

describe('BookingService.cancel', () => {
  it('throws NotFoundException when the booking does not exist', async () => {
    const service = buildService({ findUniqueBooking: jest.fn().mockResolvedValue(null) });

    await expect(service.cancel('missing-booking', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the requester does not own the booking', async () => {
    const findUniqueBooking = jest
      .fn()
      .mockResolvedValue({ id: 'booking-1', userId: 'owner-1', status: 'ACTIVE' });
    const update = jest.fn();
    const service = buildService({ findUniqueBooking, update });

    await expect(service.cancel('booking-1', 'someone-else')).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('cancels an active booking owned by the requester', async () => {
    const findUniqueBooking = jest
      .fn()
      .mockResolvedValue({ id: 'booking-1', userId: 'user-1', status: 'ACTIVE' });
    const update = jest.fn().mockResolvedValue({});
    const service = buildService({ findUniqueBooking, update });

    await service.cancel('booking-1', 'user-1');

    const [callArgs] = update.mock.calls[0] as [
      { where: { id: string }; data: { status: string; cancelledAt: Date } },
    ];
    expect(callArgs.where).toEqual({ id: 'booking-1' });
    expect(callArgs.data.status).toBe('CANCELLED');
    expect(callArgs.data.cancelledAt).toBeInstanceOf(Date);
  });

  it('is idempotent for a booking already cancelled by its owner', async () => {
    const findUniqueBooking = jest
      .fn()
      .mockResolvedValue({ id: 'booking-1', userId: 'user-1', status: 'CANCELLED' });
    const update = jest.fn();
    const service = buildService({ findUniqueBooking, update });

    await expect(service.cancel('booking-1', 'user-1')).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('standardized error codes', () => {
  it('carries a machine-readable code alongside the message for each rejection category', async () => {
    const service = buildService({});

    await expect(
      service.create(
        buildDto({ startAt: '2026-06-01T06:15:00.000Z', endAt: '2026-06-01T06:45:00.000Z' }),
        REQUESTER,
      ),
    ).rejects.toMatchObject({ response: { code: 'SLOT_MISALIGNED' } });

    await expect(
      service.create(
        // Zero-length: still slot-aligned (start === end), so this exercises
        // the duration check specifically rather than tripping alignment.
        buildDto({ startAt: '2026-06-01T06:00:00.000Z', endAt: '2026-06-01T06:00:00.000Z' }),
        REQUESTER,
      ),
    ).rejects.toMatchObject({ response: { code: 'DURATION_INVALID' } });

    jest.setSystemTime(new Date('2026-06-02T00:00:00.000Z'));
    await expect(service.create(buildDto(), REQUESTER)).rejects.toMatchObject({
      response: { code: 'PAST_START' },
    });
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    await expect(
      service.create(
        buildDto({ startAt: '2026-06-01T05:30:00.000Z', endAt: '2026-06-01T06:30:00.000Z' }),
        REQUESTER,
      ),
    ).rejects.toMatchObject({ response: { code: 'OUTSIDE_OFFICE_HOURS' } });

    const overlapping = buildService({
      findManyBooking: jest.fn().mockResolvedValue([
        {
          startAt: new Date('2026-06-01T06:15:00.000Z'),
          endAt: new Date('2026-06-01T07:00:00.000Z'),
        },
      ]),
    });
    await expect(overlapping.create(buildDto(), REQUESTER)).rejects.toMatchObject({
      response: { code: 'BOOKING_CONFLICT' },
    });

    const foreignCancel = buildService({
      findUniqueBooking: jest
        .fn()
        .mockResolvedValue({ id: 'booking-1', userId: 'owner-1', status: 'ACTIVE' }),
    });
    await expect(foreignCancel.cancel('booking-1', 'someone-else')).rejects.toMatchObject({
      response: { code: 'FORBIDDEN_CANCELLATION' },
    });
  });
});

describe('BookingService.createSeries', () => {
  it('throws NotFoundException when the room does not exist', async () => {
    const service = buildService({ findUniqueRoom: jest.fn().mockResolvedValue(null) });

    await expect(
      service.createSeries(buildSeriesDto(), buildSeriesDto().recurrence!, REQUESTER),
    ).rejects.toThrow(NotFoundException);
  });

  it('applies the same timing validation as create() to every occurrence', async () => {
    const service = buildService({});
    const dto = buildSeriesDto({
      startAt: '2026-06-02T06:15:00.000Z', // off the 30-minute grid
      endAt: '2026-06-02T06:45:00.000Z',
    });

    await expect(service.createSeries(dto, dto.recurrence!, REQUESTER)).rejects.toMatchObject({
      response: { code: 'SLOT_MISALIGNED' },
    });
  });

  it('creates every occurrence with series metadata and returns a series summary', async () => {
    const createSeriesRow = jest.fn().mockResolvedValue({ id: 'series-1' });
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: `booking-${String(data.startAt)}`,
        roomId: data.roomId,
        title: data.title,
        startAt: data.startAt,
        endAt: data.endAt,
        seriesId: data.seriesId,
        userId: data.userId,
        user: { name: 'Ivan Test' },
      }),
    );
    const service = buildService({ createSeriesRow, create });
    const dto = buildSeriesDto(); // Tue 09:00-09:30 Kyiv, 3 occurrences

    const result = await service.createSeries(dto, dto.recurrence!, REQUESTER);

    expect(result.seriesId).toBe('series-1');
    expect(result.occurrenceCount).toBe(3);
    expect(result.bookings).toHaveLength(3);
    expect(result.bookings.every((b) => b.seriesId === 'series-1')).toBe(true);
    expect(result.bookings.map((b) => b.startAt)).toEqual([
      '2026-06-02T06:00:00.000Z',
      '2026-06-09T06:00:00.000Z',
      '2026-06-16T06:00:00.000Z',
    ]);

    const [seriesCallArgs] = createSeriesRow.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(seriesCallArgs.data).toMatchObject({
      ownerId: 'user-1',
      roomId: 'room-1',
      weekday: 2, // Tuesday
      startMinute: 9 * 60,
      endMinute: 9 * 60 + 30,
      occurrenceCount: 3,
    });
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('rejects via the pre-check when an existing booking overlaps a later occurrence, naming it', async () => {
    const findManyBooking = jest.fn().mockResolvedValue([
      {
        // Overlaps only the 2nd occurrence (2026-06-09), not the 1st or 3rd.
        startAt: new Date('2026-06-09T06:15:00.000Z'),
        endAt: new Date('2026-06-09T07:00:00.000Z'),
      },
    ]);
    const service = buildService({ findManyBooking });
    const dto = buildSeriesDto();

    const rejection = service.createSeries(dto, dto.recurrence!, REQUESTER);

    await expect(rejection).rejects.toMatchObject({ response: { code: 'SERIES_CONFLICT' } });
    await rejection.catch((error: { response: { conflictingOccurrenceIndex: number } }) => {
      expect(error.response.conflictingOccurrenceIndex).toBe(1);
    });
  });

  it('rolls back and reports the occurrence when the transaction itself hits a conflict', async () => {
    const conflictError = new Prisma.PrismaClientKnownRequestError(
      'Database error, please retry.',
      {
        code: 'P2039',
        clientVersion: 'test',
        meta: { driverAdapterError: { cause: { code: '23P01' } } },
      },
    );
    // Succeeds for occurrence 0, then the database itself rejects
    // occurrence 1 (simulating a race the pre-check didn't catch).
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'booking-0',
        roomId: 'room-1',
        title: 'Sprint Planning',
        startAt: new Date('2026-06-02T06:00:00.000Z'),
        endAt: new Date('2026-06-02T06:30:00.000Z'),
        seriesId: 'series-1',
        userId: 'user-1',
        user: { name: 'Ivan Test' },
      })
      .mockRejectedValueOnce(conflictError);
    const service = buildService({ create });
    const dto = buildSeriesDto();

    const rejection = service.createSeries(dto, dto.recurrence!, REQUESTER);

    await expect(rejection).rejects.toMatchObject({ response: { code: 'SERIES_CONFLICT' } });
    await rejection.catch((error: { response: { conflictingOccurrenceIndex: number } }) => {
      expect(error.response.conflictingOccurrenceIndex).toBe(1);
    });
  });
});

describe('BookingService.cancelSeries', () => {
  it('throws NotFoundException when the series does not exist', async () => {
    const service = buildService({ findUniqueSeries: jest.fn().mockResolvedValue(null) });

    await expect(service.cancelSeries('series-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException for a non-owner and does not touch any rows', async () => {
    const updateManyBooking = jest.fn();
    const updateSeries = jest.fn();
    const service = buildService({
      findUniqueSeries: jest
        .fn()
        .mockResolvedValue({ id: 'series-1', ownerId: 'owner-1', status: 'ACTIVE' }),
      updateManyBooking,
      updateSeries,
    });

    await expect(service.cancelSeries('series-1', 'someone-else')).rejects.toMatchObject({
      response: { code: 'FORBIDDEN_CANCELLATION' },
    });
    expect(updateManyBooking).not.toHaveBeenCalled();
    expect(updateSeries).not.toHaveBeenCalled();
  });

  it('is idempotent for an already-cancelled series owned by the requester', async () => {
    const transaction = jest.fn();
    const service = buildService({
      findUniqueSeries: jest
        .fn()
        .mockResolvedValue({ id: 'series-1', ownerId: 'user-1', status: 'CANCELLED' }),
      transaction,
    });

    await expect(service.cancelSeries('series-1', 'user-1')).resolves.toBeUndefined();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('cancels every active occurrence and marks the series cancelled, atomically', async () => {
    const updateManyBooking = jest.fn().mockResolvedValue({ count: 2 });
    const updateSeries = jest.fn().mockResolvedValue({});
    const service = buildService({
      findUniqueSeries: jest
        .fn()
        .mockResolvedValue({ id: 'series-1', ownerId: 'user-1', status: 'ACTIVE' }),
      updateManyBooking,
      updateSeries,
    });

    await service.cancelSeries('series-1', 'user-1');

    const [updateManyArgs] = updateManyBooking.mock.calls[0] as [
      { where: { seriesId: string; status: string }; data: { status: string } },
    ];
    expect(updateManyArgs.where).toEqual({ seriesId: 'series-1', status: 'ACTIVE' });
    expect(updateManyArgs.data.status).toBe('CANCELLED');

    const [updateSeriesArgs] = updateSeries.mock.calls[0] as [
      { where: { id: string }; data: { status: string } },
    ];
    expect(updateSeriesArgs.where).toEqual({ id: 'series-1' });
    expect(updateSeriesArgs.data.status).toBe('CANCELLED');
  });
});
