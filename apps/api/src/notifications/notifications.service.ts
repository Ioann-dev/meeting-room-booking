import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { NOTIFICATIONS_LIST_LIMIT, type NotificationsResponse } from 'shared';
import { BookingStatus, NotificationType } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Not otherwise specified by the participant spec beyond "example default:
// 10 minutes" -- see `NOTIFY_BEFORE_MINUTES` in .env.example.
const DEFAULT_NOTIFY_BEFORE_MINUTES = 10;

// How often the ending-soon check runs, not how far ahead it looks (that's
// NOTIFY_BEFORE_MINUTES). Frequent enough that a booking is very unlikely
// to sit in its notify window for a full tick without being caught, cheap
// enough to run continuously -- this is the "lightweight scheduled check,
// not a generic event bus" architecture.md describes, so a fixed interval
// is intentionally not itself configurable.
const CHECK_INTERVAL_MS = 30_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Recent notifications for `userId`, newest first, plus the total unread
   * count (which can exceed the returned page). Every row whose
   * `deliveredAt` was still null is atomically flipped to "delivered" as
   * part of this same call -- a single conditional `UPDATE ... RETURNING`,
   * which Postgres's own row-level locking makes race-safe across
   * concurrent pollers (two tabs, or a poll racing the scheduled check's
   * own creation of a brand new row) without any extra application-level
   * locking. `justDelivered` on the returned item is true only for rows
   * this exact call flipped -- the one-time signal the client uses to
   * decide "toast this now," never true again for the same row afterward.
   */
  async listForUser(userId: string): Promise<NotificationsResponse> {
    const delivered = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Notification"
      SET "deliveredAt" = now()
      WHERE "recipientId" = ${userId}::uuid AND "deliveredAt" IS NULL
      RETURNING "id"
    `;
    const justDeliveredIds = new Set(delivered.map((row) => row.id));

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: NOTIFICATIONS_LIST_LIMIT,
        select: {
          id: true,
          type: true,
          createdAt: true,
          readAt: true,
          endingBooking: { select: { title: true, endAt: true, room: { select: { name: true } } } },
        },
      }),
      this.prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        roomName: row.endingBooking.room.name,
        endingBookingTitle: row.endingBooking.title,
        endingBookingEndAt: row.endingBooking.endAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
        justDelivered: justDeliveredIds.has(row.id),
      })),
      unreadCount,
    };
  }

  /** Idempotent: a notification already read is left untouched, not re-timestamped. */
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Finds every active booking currently ending within the notify window
   * with an active, immediately-adjacent next booking in the same room,
   * and persists one notification each. Both booking-status filters are
   * re-evaluated on every tick straight from the database, so a
   * cancellation removes a booking from the candidate set before the next
   * run without any separate invalidation step. `dedupeKey`'s unique
   * constraint (derived deterministically from the ending booking's id) is
   * the actual once-only guarantee -- `skipDuplicates` turns what would
   * otherwise be a unique-violation error on a booking re-seen across
   * multiple ticks into a silent, correct no-op.
   */
  // A transient DB outage must not turn into an unhandled rejection --
  // there is no caller to report to (the scheduler fires this itself), and
  // the check is naturally self-healing: the next tick 30s later just
  // tries again against the same query, so logging and returning is the
  // whole recovery strategy needed here.
  @Interval(CHECK_INTERVAL_MS)
  async runEndingSoonCheck(): Promise<void> {
    try {
      await this.checkEndingSoon();
    } catch (error) {
      this.logger.error(
        'Ending-soon notification check failed',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async checkEndingSoon(): Promise<void> {
    const notifyBeforeMinutes = this.getNotifyBeforeMinutes();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + notifyBeforeMinutes * 60_000);

    const endingSoon = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.ACTIVE,
        startAt: { lte: now },
        endAt: { gt: now, lte: windowEnd },
      },
      select: { id: true, userId: true, roomId: true, endAt: true },
    });
    if (endingSoon.length === 0) {
      return;
    }

    // One query per candidate rather than a single batched lookup: at any
    // given 30s tick this list is small (bounded by how many rooms exist),
    // and the per-candidate query is a direct, easy-to-verify expression of
    // "is a booking starting exactly when this one ends" -- not worth the
    // extra complexity of a batched IN-clause-plus-grouping version for a
    // bonus feature at this scale.
    const toCreate: {
      recipientId: string;
      type: NotificationType;
      endingBookingId: string;
      nextBookingId: string;
      dedupeKey: string;
    }[] = [];
    for (const booking of endingSoon) {
      const nextBooking = await this.prisma.booking.findFirst({
        where: { roomId: booking.roomId, status: BookingStatus.ACTIVE, startAt: booking.endAt },
        select: { id: true },
      });
      if (!nextBooking) {
        continue;
      }
      toCreate.push({
        recipientId: booking.userId,
        type: NotificationType.BOOKING_ENDING_SOON,
        endingBookingId: booking.id,
        nextBookingId: nextBooking.id,
        dedupeKey: `${NotificationType.BOOKING_ENDING_SOON}:${booking.id}`,
      });
    }
    if (toCreate.length === 0) {
      return;
    }

    const result = await this.prisma.notification.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    if (result.count > 0) {
      this.logger.log(`Created ${result.count} ending-soon notification(s)`);
    }
  }

  private getNotifyBeforeMinutes(): number {
    const raw = this.config.get<string>('NOTIFY_BEFORE_MINUTES');
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NOTIFY_BEFORE_MINUTES;
  }
}
