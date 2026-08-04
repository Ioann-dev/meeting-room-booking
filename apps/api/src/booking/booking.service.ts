import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BOOKING_ERROR_CODES,
  generateWeeklyOccurrences,
  getOfficeWeekBoundaries,
  intervalsOverlap,
  isAlignedToSlot,
  isValidDuration,
  isWithinOfficeHours,
  OFFICE_TIMEZONE,
  parseIsoInstant,
  toZonedParts,
  type BookingSeriesSummary,
  type BookingSummary,
  type RoomScheduleResponse,
} from 'shared';
import { BookingSeriesStatus, BookingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, RecurrenceInputDto } from './dto/create-booking.dto';
import type { AuthenticatedUser } from '../auth/auth.service';

const BOOKING_WITH_AUTHOR_SELECT = {
  id: true,
  roomId: true,
  title: true,
  startAt: true,
  endAt: true,
  seriesId: true,
  userId: true,
  user: { select: { name: true } },
} as const;

type BookingWithAuthor = {
  id: string;
  roomId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  seriesId: string | null;
  userId: string;
  user: { name: string };
};

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto, user: AuthenticatedUser): Promise<BookingSummary> {
    await this.requireRoom(dto.roomId);

    // Never the native `Date` constructor here: it resolves an
    // offset-less string in the host process's local zone (see
    // packages/shared/src/time.ts), which would make the persisted
    // instant depend on where the API happens to run. The DTO already
    // requires an explicit offset/"Z" (ISO_INSTANT_PATTERN), so
    // parseIsoInstant is host-zone-independent for every input that
    // reaches this line.
    const startAt = parseIsoInstant(dto.startAt);
    const endAt = parseIsoInstant(dto.endAt);
    this.validateOccurrenceTiming(startAt, endAt);

    // Fast, non-racy pre-check for the overwhelmingly common non-concurrent
    // case: reuse the same shared overlap predicate the interval unit tests
    // cover, applied over this room's active bookings, so the rule can
    // never drift from the one the exclusion constraint below encodes. The
    // `startAt < endAt AND endAt > startAt` filter is the same half-open
    // overlap inequality expressed as a query bound -- it narrows the rows
    // fetched to a superset of anything that could possibly overlap, so
    // this stays a query optimization, not a second, potentially-drifting
    // copy of the overlap rule: intervalsOverlap is still the decider.
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        roomId: dto.roomId,
        status: BookingStatus.ACTIVE,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { startAt: true, endAt: true },
    });
    if (activeBookings.some((b) => intervalsOverlap(startAt, endAt, b.startAt, b.endAt))) {
      throw bookingConflictError();
    }

    let created: BookingWithAuthor;
    try {
      created = await this.prisma.booking.create({
        data: {
          title: dto.title,
          startAt,
          endAt,
          roomId: dto.roomId,
          userId: user.id,
        },
        select: BOOKING_WITH_AUTHOR_SELECT,
      });
    } catch (error) {
      // The pre-check above has a race window between two concurrent
      // requests; the database's EXCLUDE constraint (see
      // docs/decisions/0001-booking-overlap.md) is the actual overlap
      // authority and is what makes this catch reachable at all. Map it to
      // the same conflict response the pre-check produces, so the client
      // sees one consistent error contract either way.
      if (isOverlapConstraintViolation(error)) {
        throw bookingConflictError();
      }
      throw error;
    }

    return this.toSummary(created, user.id);
  }

  // Happy-path series creation: generates every occurrence in office-local
  // calendar weeks (DST-safe), applies the identical per-occurrence
  // validation create() applies to a single booking, and inserts the
  // series row plus every occurrence in one transaction so a mid-series
  // failure leaves nothing behind. Occurrence-specific conflict reporting
  // (which occurrence collided) is layered on in createSeries's own
  // overlap handling below the transaction.
  async createSeries(
    dto: CreateBookingDto,
    recurrence: RecurrenceInputDto,
    user: AuthenticatedUser,
  ): Promise<BookingSeriesSummary> {
    await this.requireRoom(dto.roomId);

    const firstStart = parseIsoInstant(dto.startAt);
    const firstEnd = parseIsoInstant(dto.endAt);
    this.validateOccurrenceTiming(firstStart, firstEnd);

    const occurrences = generateWeeklyOccurrences(
      firstStart,
      firstEnd,
      recurrence.occurrenceCount,
    ).map((occ) => ({
      startAt: parseIsoInstant(occ.startUtc),
      endAt: parseIsoInstant(occ.endUtc),
    }));
    for (const occurrence of occurrences) {
      this.validateOccurrenceTiming(occurrence.startAt, occurrence.endAt);
    }

    // Fast, non-racy pre-check across the whole series window (same shared
    // predicate and same query-bounding approach as create()'s single-slot
    // pre-check): finds the first occurrence that collides with an
    // existing active booking before opening a transaction at all, so the
    // overwhelmingly common non-concurrent case gets a fast, specific
    // "occurrence N conflicts" response instead of paying for a
    // transaction that's going to roll back anyway.
    const seriesWindowStart = occurrences[0]!.startAt;
    const seriesWindowEnd = occurrences[occurrences.length - 1]!.endAt;
    const candidateBookings = await this.prisma.booking.findMany({
      where: {
        roomId: dto.roomId,
        status: BookingStatus.ACTIVE,
        startAt: { lt: seriesWindowEnd },
        endAt: { gt: seriesWindowStart },
      },
      select: { startAt: true, endAt: true },
    });
    const preCheckConflictIndex = occurrences.findIndex((occurrence) =>
      candidateBookings.some((b) =>
        intervalsOverlap(occurrence.startAt, occurrence.endAt, b.startAt, b.endAt),
      ),
    );
    if (preCheckConflictIndex !== -1) {
      throw seriesConflictError(
        occurrences[preCheckConflictIndex]!,
        preCheckConflictIndex,
        recurrence.occurrenceCount,
      );
    }

    const firstStartParts = toZonedParts(firstStart, OFFICE_TIMEZONE);
    const firstEndParts = toZonedParts(firstEnd, OFFICE_TIMEZONE);

    // Tracks which occurrence is being inserted when/if the transaction
    // fails, so a race that the pre-check above missed (another request
    // took the slot between the pre-check and this insert) can still be
    // reported as "occurrence N conflicts" rather than a generic error.
    // The whole transaction rolls back on any thrown error -- Prisma's
    // interactive $transaction issues a real ROLLBACK, so no occurrence
    // before the failing one is left behind either.
    let currentIndex = 0;
    let seriesId: string;
    let created: BookingWithAuthor[];
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const series = await tx.bookingSeries.create({
          data: {
            ownerId: user.id,
            roomId: dto.roomId,
            weekday: firstStartParts.weekday,
            startMinute: firstStartParts.hour * 60 + firstStartParts.minute,
            endMinute: firstEndParts.hour * 60 + firstEndParts.minute,
            occurrenceCount: recurrence.occurrenceCount,
          },
        });

        const rows: BookingWithAuthor[] = [];
        for (let i = 0; i < occurrences.length; i++) {
          currentIndex = i;
          const occurrence = occurrences[i]!;
          const booking = await tx.booking.create({
            data: {
              title: dto.title,
              startAt: occurrence.startAt,
              endAt: occurrence.endAt,
              roomId: dto.roomId,
              userId: user.id,
              seriesId: series.id,
            },
            select: BOOKING_WITH_AUTHOR_SELECT,
          });
          rows.push(booking);
        }
        return { seriesId: series.id, rows };
      });
      seriesId = result.seriesId;
      created = result.rows;
    } catch (error) {
      if (isOverlapConstraintViolation(error)) {
        throw seriesConflictError(
          occurrences[currentIndex]!,
          currentIndex,
          recurrence.occurrenceCount,
        );
      }
      throw error;
    }

    return {
      seriesId,
      roomId: dto.roomId,
      occurrenceCount: recurrence.occurrenceCount,
      bookings: created.map((booking) => this.toSummary(booking, user.id)),
    };
  }

  async getRoomSchedule(
    roomId: string,
    referenceDate: string | undefined,
    requesterId: string,
  ): Promise<RoomScheduleResponse> {
    await this.requireRoom(roomId);

    const { startUtc, endUtc } = getOfficeWeekBoundaries(referenceDate ?? new Date().toISOString());

    const bookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        status: BookingStatus.ACTIVE,
        startAt: { lt: new Date(endUtc) },
        endAt: { gt: new Date(startUtc) },
      },
      orderBy: { startAt: 'asc' },
      select: BOOKING_WITH_AUTHOR_SELECT,
    });

    return {
      roomId,
      weekStartUtc: startUtc,
      weekEndUtc: endUtc,
      bookings: bookings.map((booking) => this.toSummary(booking, requesterId)),
    };
  }

  // Idempotent by design: cancelling an already-cancelled booking you own
  // succeeds silently rather than erroring, so a retried or double-tapped
  // cancel request never surfaces a spurious failure. Ownership is checked
  // before that idempotent short-circuit, so a non-owner never learns
  // whether a booking was already cancelled.
  async cancel(bookingId: string, requesterId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== requesterId) {
      throw forbiddenCancellationError();
    }
    if (booking.status === BookingStatus.CANCELLED) {
      return;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  // Cancelling one occurrence needs no dedicated series logic at all: an
  // occurrence is just a Booking row with a seriesId set, so the plain
  // cancel() above already handles it correctly (ownership check against
  // that row's own userId, same idempotent-re-cancel behavior). This
  // method is specifically for "cancel every still-active occurrence of
  // the series" -- the same ownership-before-idempotency ordering as
  // cancel(), so a non-owner never learns whether the series was already
  // cancelled, extended to the series as a whole.
  async cancelSeries(seriesId: string, requesterId: string): Promise<void> {
    const series = await this.prisma.bookingSeries.findUnique({
      where: { id: seriesId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!series) {
      throw new NotFoundException('Booking series not found');
    }
    if (series.ownerId !== requesterId) {
      throw forbiddenSeriesCancellationError();
    }
    if (series.status === BookingSeriesStatus.CANCELLED) {
      return;
    }

    // Both updates in one transaction: an interrupted cancellation
    // (process crash between the two statements) must never leave the
    // series marked ACTIVE while its occurrences are CANCELLED, or vice
    // versa -- either both happen or neither does.
    await this.prisma.$transaction([
      this.prisma.booking.updateMany({
        where: { seriesId, status: BookingStatus.ACTIVE },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      }),
      this.prisma.bookingSeries.update({
        where: { id: seriesId },
        data: { status: BookingSeriesStatus.CANCELLED },
      }),
    ]);
  }

  private async requireRoom(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
  }

  // The single-booking rule set from create(), factored out so a
  // recurring series applies exactly the same validation to every
  // occurrence rather than a second, potentially-drifting copy of it.
  private validateOccurrenceTiming(startAt: Date, endAt: Date): void {
    if (!isAlignedToSlot(startAt, OFFICE_TIMEZONE) || !isAlignedToSlot(endAt, OFFICE_TIMEZONE)) {
      throw slotMisalignedError();
    }
    if (!isValidDuration(startAt, endAt)) {
      throw durationInvalidError();
    }
    if (startAt.getTime() <= Date.now()) {
      throw pastStartError();
    }
    if (!isWithinOfficeHours(startAt, endAt)) {
      throw outsideOfficeHoursError();
    }
  }

  private toSummary(booking: BookingWithAuthor, requesterId: string): BookingSummary {
    return {
      id: booking.id,
      roomId: booking.roomId,
      title: booking.title,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      authorName: booking.user.name,
      isOwnBooking: booking.userId === requesterId,
      seriesId: booking.seriesId,
    };
  }
}

// Each helper pairs a stable machine-readable `code` (see
// packages/shared/src/booking.ts) with the human-readable `message` in the
// same response body, so a client can branch on `code` without parsing
// prose while the message stays readable on its own.
function slotMisalignedError(): BadRequestException {
  return new BadRequestException({
    code: BOOKING_ERROR_CODES.SLOT_MISALIGNED,
    message: 'Start and end times must align to 30-minute slots',
  });
}

function durationInvalidError(): BadRequestException {
  return new BadRequestException({
    code: BOOKING_ERROR_CODES.DURATION_INVALID,
    message: 'Booking duration must be between 30 minutes and 4 hours',
  });
}

function pastStartError(): BadRequestException {
  return new BadRequestException({
    code: BOOKING_ERROR_CODES.PAST_START,
    message: 'Bookings must start in the future',
  });
}

function outsideOfficeHoursError(): BadRequestException {
  return new BadRequestException({
    code: BOOKING_ERROR_CODES.OUTSIDE_OFFICE_HOURS,
    message: 'Bookings must fall entirely within office hours (09:00-19:00 Europe/Kyiv)',
  });
}

function bookingConflictError(): ConflictException {
  return new ConflictException({
    code: BOOKING_ERROR_CODES.BOOKING_CONFLICT,
    message: 'This time slot is already booked',
  });
}

function formatOccurrenceLabel(startAt: Date): string {
  const parts = toZonedParts(startAt, OFFICE_TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)} ${OFFICE_TIMEZONE}`;
}

// Distinct from bookingConflictError so a series-creation rejection names
// which occurrence of the recurring pattern collided -- "occurrence 3 of
// 8, on 2026-11-03 09:00 Europe/Kyiv" is a materially more useful message
// than a generic "this slot is booked" for a request that was never about
// one slot.
function seriesConflictError(
  occurrence: { startAt: Date },
  index: number,
  occurrenceCount: number,
): ConflictException {
  return new ConflictException({
    code: BOOKING_ERROR_CODES.SERIES_CONFLICT,
    message: `This recurring booking conflicts with an existing booking on ${formatOccurrenceLabel(
      occurrence.startAt,
    )} (occurrence ${index + 1} of ${occurrenceCount})`,
    conflictingOccurrenceIndex: index,
    conflictingOccurrenceStartAt: occurrence.startAt.toISOString(),
  });
}

function forbiddenCancellationError(): ForbiddenException {
  return new ForbiddenException({
    code: BOOKING_ERROR_CODES.FORBIDDEN_CANCELLATION,
    message: 'You can only cancel your own booking',
  });
}

// Same code as forbiddenCancellationError -- the authorization rule is
// identical, only the wording differs to say "series" instead of
// "booking" for a clearer message on this endpoint.
function forbiddenSeriesCancellationError(): ForbiddenException {
  return new ForbiddenException({
    code: BOOKING_ERROR_CODES.FORBIDDEN_CANCELLATION,
    message: 'You can only cancel your own booking series',
  });
}

// Postgres SQLSTATEs that mean "another request is contending for this
// exact room/slot": 23P01 is the exclusion constraint's own violation
// code; 40P01 is a deadlock, which a GiST exclusion constraint's overlap
// check can also surface under genuinely concurrent inserts for
// overlapping ranges instead of a clean 23P01 (confirmed empirically by
// the concurrency test, which reproduces it reliably). Both mean the same
// thing from the caller's perspective, so both map to the same 409.
const OVERLAP_SQLSTATES = new Set(['23P01', '40P01']);

// With @prisma/adapter-pg (Prisma 7.9.1, confirmed by directly triggering
// this exact constraint against Postgres), a caught overlap/deadlock
// error is a PrismaClientKnownRequestError whose top-level `.code` is a
// generic wrapper (e.g. "P2039", "database error") and whose
// `.meta.constraint` is **not populated** -- this driver never emits it,
// so matching on it would silently never fire. The real Postgres SQLSTATE
// lives at `.meta.driverAdapterError.cause.code`. That structured field is
// checked first; the message-substring checks below only exist as a
// fallback for a Prisma version/driver that doesn't populate it.
export function isOverlapConstraintViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  const meta = error.meta as { driverAdapterError?: { cause?: { code?: unknown } } } | undefined;
  const sqlState = meta?.driverAdapterError?.cause?.code;
  if (typeof sqlState === 'string' && OVERLAP_SQLSTATES.has(sqlState)) {
    return true;
  }

  return (
    error.message.includes('Booking_no_overlap') ||
    error.message.includes('23P01') ||
    error.message.includes('40P01')
  );
}
