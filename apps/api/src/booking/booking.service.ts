import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  getOfficeWeekBoundaries,
  intervalsOverlap,
  isAlignedToSlot,
  isValidDuration,
  isWithinOfficeHours,
  OFFICE_TIMEZONE,
  type BookingSummary,
  type RoomScheduleResponse,
} from 'shared';
import { BookingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (!isAlignedToSlot(startAt, OFFICE_TIMEZONE) || !isAlignedToSlot(endAt, OFFICE_TIMEZONE)) {
      throw new BadRequestException('Start and end times must align to 30-minute slots');
    }
    if (!isValidDuration(startAt, endAt)) {
      throw new BadRequestException('Booking duration must be between 30 minutes and 4 hours');
    }
    if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException('Bookings must start in the future');
    }
    if (!isWithinOfficeHours(startAt, endAt)) {
      throw new BadRequestException(
        'Bookings must fall entirely within office hours (09:00-19:00 Europe/Kyiv)',
      );
    }

    // Fast, non-racy pre-check for the overwhelmingly common non-concurrent
    // case: reuse the same shared overlap predicate the interval unit tests
    // cover, applied over this room's current active bookings, so the rule
    // can never drift from the one the exclusion constraint below encodes.
    const activeBookings = await this.prisma.booking.findMany({
      where: { roomId: dto.roomId, status: BookingStatus.ACTIVE },
      select: { startAt: true, endAt: true },
    });
    if (activeBookings.some((b) => intervalsOverlap(startAt, endAt, b.startAt, b.endAt))) {
      throw new ConflictException('This time slot is already booked');
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
        throw new ConflictException('This time slot is already booked');
      }
      throw error;
    }

    return this.toSummary(created, user.id);
  }

  async getRoomSchedule(
    roomId: string,
    referenceDate: string | undefined,
    requesterId: string,
  ): Promise<RoomScheduleResponse> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

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
      throw new ForbiddenException('You can only cancel your own booking');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      return;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
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

// Matched by constraint name and message content rather than only Prisma's
// `.code`, since a generic Postgres constraint violation (not a
// Prisma-native unique/foreign-key case) doesn't map to one fixed, stable
// Prisma error code across versions -- the constraint name embedded in the
// underlying Postgres error is the one thing guaranteed not to change.
function isOverlapConstraintViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const constraint = error.meta?.constraint;
    return (
      (typeof constraint === 'string' && constraint.includes('Booking_no_overlap')) ||
      error.message.includes('Booking_no_overlap')
    );
  }
  return false;
}
