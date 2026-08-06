import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { MyPastBookingsResponse, MyUpcomingBookingsResponse } from 'shared';
import { createTestApp } from './utils/bootstrap-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingStatus } from '../generated/prisma/client';

function uniqueEmail(label: string): string {
  return `${label}.${randomUUID()}@example.com`;
}

function sessionCookieFrom(response: { headers: Record<string, unknown> }): string {
  const setCookie = response.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const sessionCookie = cookies.find(
    (cookie): cookie is string => typeof cookie === 'string' && cookie.startsWith('session='),
  );
  if (!sessionCookie) {
    throw new Error('Response did not set a session cookie');
  }
  return sessionCookie.split(';')[0]!;
}

const HOUR_MS = 60 * 60_000;

describe('My Bookings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const roomIds: string[] = [];

  async function registerVerifiedUser(label: string): Promise<{ cookie: string; userId: string }> {
    const email = uniqueEmail(label);
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: `${label} User`, email, password: 'ValidPass123' })
      .expect(201);
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    });
    return { cookie: sessionCookieFrom(response), userId: user.id };
  }

  // A fresh room per test (not one shared room across the whole file):
  // several tests here create bookings at now-relative offsets, and two
  // tests sharing one room could otherwise generate identical or
  // overlapping time ranges and trip the exclusion constraint against each
  // other, which has nothing to do with what either test is verifying.
  async function createRoom(): Promise<string> {
    const room = await prisma.room.create({
      data: { name: `E2E My-Bookings Room ${randomUUID()}`, floor: 4, capacity: 6 },
    });
    roomIds.push(room.id);
    return room.id;
  }

  async function makeBooking(opts: {
    roomId: string;
    userId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status?: BookingStatus;
  }) {
    const status = opts.status ?? BookingStatus.ACTIVE;
    return prisma.booking.create({
      data: {
        title: opts.title,
        roomId: opts.roomId,
        userId: opts.userId,
        startAt: opts.startAt,
        endAt: opts.endAt,
        status,
        cancelledAt: status === BookingStatus.CANCELLED ? new Date() : null,
      },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
    await app.close();
  });

  describe('GET /bookings/mine?scope=upcoming', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/bookings/mine?scope=upcoming').expect(401);
    });

    it('returns only active, not-yet-ended bookings, nearest first', async () => {
      const { cookie, userId } = await registerVerifiedUser('upcoming');
      const roomId = await createRoom();
      const now = Date.now();

      const soon = await makeBooking({
        roomId,
        userId,
        title: 'Soonest',
        startAt: new Date(now + HOUR_MS),
        endAt: new Date(now + 2 * HOUR_MS),
      });
      const later = await makeBooking({
        roomId,
        userId,
        title: 'Later',
        startAt: new Date(now + 5 * HOUR_MS),
        endAt: new Date(now + 6 * HOUR_MS),
      });
      // Excluded: already ended.
      await makeBooking({
        roomId,
        userId,
        title: 'Already over',
        startAt: new Date(now - 3 * HOUR_MS),
        endAt: new Date(now - 2 * HOUR_MS),
      });
      // Excluded: cancelled, even though still in the future.
      await makeBooking({
        roomId,
        userId,
        title: 'Cancelled future',
        startAt: new Date(now + 3 * HOUR_MS),
        endAt: new Date(now + 4 * HOUR_MS),
        status: BookingStatus.CANCELLED,
      });

      const response = await request(app.getHttpServer())
        .get('/bookings/mine?scope=upcoming')
        .set('Cookie', cookie)
        .expect(200);

      const body = response.body as MyUpcomingBookingsResponse;
      expect(body.items.map((item) => item.id)).toEqual([soon.id, later.id]);
      expect(body.items[0]).toMatchObject({ title: 'Soonest', status: 'ACTIVE' });
    });
  });

  describe('GET /bookings/mine?scope=past', () => {
    it('returns ended and cancelled bookings, most recent first, and paginates by cursor', async () => {
      const { cookie, userId } = await registerVerifiedUser('past');
      const roomId = await createRoom();
      const now = Date.now();

      // Five distinctly-ordered, non-overlapping past bookings: three
      // naturally ended, two cancelled.
      const bookings: Awaited<ReturnType<typeof makeBooking>>[] = [];
      for (const [index, hoursAgo] of [1, 2, 3, 4, 5].entries()) {
        bookings.push(
          await makeBooking({
            roomId,
            userId,
            title: `Past ${hoursAgo}h ago`,
            startAt: new Date(now - (hoursAgo + 1) * HOUR_MS),
            endAt: new Date(now - hoursAgo * HOUR_MS),
            status: index < 2 ? BookingStatus.CANCELLED : BookingStatus.ACTIVE,
          }),
        );
      }
      // Newest (least-hours-ago) first.
      const expectedOrder = [...bookings].sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

      const collected: string[] = [];
      let cursor: string | null | undefined;
      do {
        const response = await request(app.getHttpServer())
          .get('/bookings/mine')
          .query({ scope: 'past', limit: 2, ...(cursor ? { cursor } : {}) })
          .set('Cookie', cookie)
          .expect(200);
        const body = response.body as MyPastBookingsResponse;
        expect(body.items.length).toBeLessThanOrEqual(2);
        collected.push(...body.items.map((item) => item.id));
        cursor = body.nextCursor;
      } while (cursor);

      expect(collected).toEqual(expectedOrder.map((b) => b.id));
    });

    it('rejects a malformed cursor', async () => {
      const { cookie } = await registerVerifiedUser('bad-cursor');
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .query({ scope: 'past', cursor: 'not-a-real-cursor' })
        .set('Cookie', cookie)
        .expect(400);
    });
  });
});
