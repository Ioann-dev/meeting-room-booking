import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import { createTestApp } from '../utils/bootstrap-app';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { BookingService } from '../../src/booking/booking.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';

// The service falls back to a 10-minute default whenever NOTIFY_BEFORE_MINUTES
// isn't set (see notifications.service.ts); every fixture below is written
// relative to that default so the tests don't depend on local .env content.
const DEFAULT_WINDOW_MINUTES = 10;
const MINUTE_MS = 60_000;

describe('Booking-ending-soon notification check (database-level)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let bookings: BookingService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
    bookings = app.get(BookingService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createRoom() {
    return prisma.room.create({
      data: { name: `Notify Test Room ${randomUUID()}`, floor: 1, capacity: 4 },
    });
  }

  async function createUser(label: string) {
    return prisma.user.create({
      data: {
        name: `${label} User`,
        email: `${label}.${randomUUID()}@example.com`,
        passwordHash: 'hash',
      },
    });
  }

  async function createBooking(opts: {
    roomId: string;
    userId: string;
    startAt: Date;
    endAt: Date;
    status?: BookingStatus;
  }) {
    const status = opts.status ?? BookingStatus.ACTIVE;
    return prisma.booking.create({
      data: {
        title: 'Test booking',
        roomId: opts.roomId,
        userId: opts.userId,
        startAt: opts.startAt,
        endAt: opts.endAt,
        status,
        cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
      },
    });
  }

  function notificationsFor(endingBookingId: string) {
    return prisma.notification.findMany({ where: { endingBookingId } });
  }

  it('notifies the owner when the booking ends within the window and the next slot is occupied', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    const next = await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();

    const created = await notificationsFor(ending.id);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      recipientId: owner.id,
      nextBookingId: next.id,
      dedupeKey: `BOOKING_ENDING_SOON:${ending.id}`,
    });
  });

  it('does not notify when there is no following booking', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('does not notify when the next booking has a gap before it (not immediately adjacent)', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    // Starts 30 minutes after `ending` finishes -- the slot immediately
    // after `ending` is actually free, so this must not count as "occupied".
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
      endAt: new Date(ending.endAt.getTime() + 60 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('does not notify when the ending booking is outside the notify window', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    // Ends well beyond the default 10-minute window.
    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 5 * MINUTE_MS),
      endAt: new Date(now + (DEFAULT_WINDOW_MINUTES + 20) * MINUTE_MS),
    });
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('does not notify when the ending booking itself is cancelled', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
      status: BookingStatus.CANCELLED,
    });
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('does not notify when the next booking is cancelled (the slot is actually free)', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
      status: BookingStatus.CANCELLED,
    });

    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('creates exactly one notification no matter how many times the check runs', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();
    await notifications.runEndingSoonCheck();
    await notifications.runEndingSoonCheck();

    expect(await notificationsFor(ending.id)).toHaveLength(1);
  });

  // The scheduled check can only enforce "no notification if either
  // booking is cancelled" as a precondition at creation time; a
  // cancellation landing between creation and delivery needs its own
  // cleanup, which lives in BookingService.cancel()/cancelSeries().
  it('retracts an already-created notification when the next booking is cancelled before delivery', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    const next = await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();
    expect(await notificationsFor(ending.id)).toHaveLength(1);

    await bookings.cancel(next.id, nextOwner.id);

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('retracts an already-created notification when the ending booking itself is cancelled before delivery', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();
    expect(await notificationsFor(ending.id)).toHaveLength(1);

    await bookings.cancel(ending.id, owner.id);

    expect(await notificationsFor(ending.id)).toHaveLength(0);
  });

  it('does not retroactively remove a notification that was already delivered', async () => {
    const room = await createRoom();
    const owner = await createUser('owner');
    const nextOwner = await createUser('next-owner');
    const now = Date.now();

    const ending = await createBooking({
      roomId: room.id,
      userId: owner.id,
      startAt: new Date(now - 20 * MINUTE_MS),
      endAt: new Date(now + 5 * MINUTE_MS),
    });
    const next = await createBooking({
      roomId: room.id,
      userId: nextOwner.id,
      startAt: ending.endAt,
      endAt: new Date(ending.endAt.getTime() + 30 * MINUTE_MS),
    });

    await notifications.runEndingSoonCheck();
    // Simulates the owner having already polled/loaded the notification
    // (listForUser() is what normally flips this) before the cancellation.
    await prisma.notification.updateMany({
      where: { endingBookingId: ending.id },
      data: { deliveredAt: new Date() },
    });

    await bookings.cancel(next.id, nextOwner.id);

    expect(await notificationsFor(ending.id)).toHaveLength(1);
  });
});
