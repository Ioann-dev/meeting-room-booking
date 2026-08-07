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
   * with an active, immediately-adjacent next booking in the same room, and
   * persists one notification each.
   *
   * The candidate lists below (`endingSoon`, each `nextBooking`) are reads,
   * not authority -- either booking can be cancelled by a concurrent
   * request at any point after they're read and before this method's own
   * writes commit, and `cancel()`/`cancelSeries()` only retract a
   * notification that already exists at the moment they run. Without a
   * further check, a cancellation landing in that window would leave this
   * method inserting a notification for a booking that is, by the time the
   * insert executes, already cancelled -- the exact bug the feature
   * promises can't happen. So the actual write is a single atomic
   * `INSERT ... SELECT ... WHERE` per candidate (see `insertIfStillActive`)
   * that re-reads both bookings' current `status` from the database as
   * part of the same statement that performs the insert, instead of
   * trusting the earlier in-memory read -- there is no gap between "is this
   * still valid" and "write it" for a concurrent cancellation to land in.
   * `dedupeKey`'s unique constraint (derived deterministically from the
   * ending booking's id) remains the once-only guarantee across repeated
   * ticks seeing the same booking; `ON CONFLICT ... DO NOTHING` is the raw-
   * SQL equivalent of `skipDuplicates` for that case.
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
    const candidates: { endingBookingId: string; nextBookingId: string; dedupeKey: string }[] = [];
    for (const booking of endingSoon) {
      const nextBooking = await this.prisma.booking.findFirst({
        where: { roomId: booking.roomId, status: BookingStatus.ACTIVE, startAt: booking.endAt },
        select: { id: true },
      });
      if (!nextBooking) {
        continue;
      }
      candidates.push({
        endingBookingId: booking.id,
        nextBookingId: nextBooking.id,
        dedupeKey: `${NotificationType.BOOKING_ENDING_SOON}:${booking.id}`,
      });
    }
    if (candidates.length === 0) {
      return;
    }

    let createdCount = 0;
    for (const candidate of candidates) {
      createdCount += await this.insertIfStillActive(candidate);
    }
    if (createdCount > 0) {
      this.logger.log(`Created ${createdCount} ending-soon notification(s)`);
    }
  }

  /**
   * Inserts one BOOKING_ENDING_SOON notification, but only for rows where
   * both the ending and next booking are still ACTIVE *at the moment this
   * statement executes* -- re-read from "Booking" in the same SELECT that
   * feeds the INSERT, not the caller's earlier (by now potentially stale)
   * read. Returns the number of rows actually inserted (0 when either
   * booking is no longer active, or the dedupeKey already exists from an
   * earlier tick).
   *
   * `FOR KEY SHARE OF eb, nb` is load-bearing, not just the SELECT...WHERE
   * re-check on its own: under READ COMMITTED (this app's default, and
   * Postgres's own default), a plain SELECT never blocks on another
   * transaction's uncommitted row lock -- it just reads the last-committed
   * version as of when this statement started. cancel()/cancelSeries()
   * (BookingService) run their own status UPDATE and this method's
   * candidate booking(s) in the same multi-statement transaction; without a
   * locking read here, this SELECT could take its snapshot *before* that
   * UPDATE commits (correctly seeing ACTIVE, since it hadn't committed yet)
   * while the physical INSERT itself only completes *after* that
   * transaction commits -- by which point cancel's own notification-
   * cleanup step has already run and found nothing to delete, orphaning an
   * invalid notification despite every individual read having been
   * "correct" at the instant it happened. `FOR KEY SHARE` forces this
   * SELECT to block if `cancel()`'s UPDATE already holds the row, then
   * (per Postgres's standard EvalPlanQual re-check) re-evaluates the WHERE
   * clause against the just-committed row once unblocked -- closing that
   * gap rather than merely narrowing it. KEY SHARE, not the stronger
   * UPDATE/SHARE, since this statement only ever reads these rows.
   */
  private async insertIfStillActive(candidate: {
    endingBookingId: string;
    nextBookingId: string;
    dedupeKey: string;
  }): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "recipientId", "type", "endingBookingId", "nextBookingId", "dedupeKey")
      SELECT gen_random_uuid(), eb."userId", 'BOOKING_ENDING_SOON'::"NotificationType", eb."id", nb."id", ${candidate.dedupeKey}
      FROM "Booking" eb
      JOIN "Booking" nb ON nb."id" = ${candidate.nextBookingId}::uuid
      WHERE eb."id" = ${candidate.endingBookingId}::uuid
        AND eb."status" = 'ACTIVE'
        AND nb."status" = 'ACTIVE'
      FOR KEY SHARE OF eb, nb
      ON CONFLICT ("dedupeKey") DO NOTHING
    `;
  }

  private getNotifyBeforeMinutes(): number {
    const raw = this.config.get<string>('NOTIFY_BEFORE_MINUTES');
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NOTIFY_BEFORE_MINUTES;
  }
}
