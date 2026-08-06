import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { NotificationsResponse } from 'shared';
import { createTestApp } from './utils/bootstrap-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationType } from '../generated/prisma/client';

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

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const roomIds: string[] = [];
  let roomNameByCall: string;

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

  // A fresh room per call (not one shared room across the whole file):
  // every call uses the same now-relative offsets for its ending/next
  // booking pair, so two calls sharing a room would trip the exclusion
  // constraint against each other regardless of which test made them.
  async function createNotificationFor(userId: string) {
    const roomName = `E2E Notification Room ${randomUUID()}`;
    const room = await prisma.room.create({ data: { name: roomName, floor: 9, capacity: 6 } });
    roomIds.push(room.id);
    roomNameByCall = roomName;

    const ending = await prisma.booking.create({
      data: {
        title: 'Ending soon',
        roomId: room.id,
        userId,
        startAt: new Date(Date.now() - 20 * 60_000),
        endAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    const next = await prisma.booking.create({
      data: {
        title: 'Up next',
        roomId: room.id,
        userId,
        startAt: ending.endAt,
        endAt: new Date(ending.endAt.getTime() + 30 * 60_000),
      },
    });
    return prisma.notification.create({
      data: {
        recipientId: userId,
        type: NotificationType.BOOKING_ENDING_SOON,
        endingBookingId: ending.id,
        nextBookingId: next.id,
        dedupeKey: `BOOKING_ENDING_SOON:${ending.id}`,
      },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { endingBooking: { roomId: { in: roomIds } } } });
    await prisma.booking.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
    await app.close();
  });

  describe('GET /notifications', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });

    it('lists a recent notification with room/title/time and marks it unread by default', async () => {
      const { cookie, userId } = await registerVerifiedUser('list-basic');
      const created = await createNotificationFor(userId);
      const roomName = roomNameByCall;

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', cookie)
        .expect(200);

      const body = response.body as NotificationsResponse;
      expect(body.unreadCount).toBe(1);
      const item = body.items.find((n) => n.id === created.id);
      expect(item).toMatchObject({
        type: 'BOOKING_ENDING_SOON',
        roomName,
        endingBookingTitle: 'Ending soon',
        readAt: null,
      });
    });

    it('flags a notification as justDelivered exactly once across repeated polls', async () => {
      const { cookie, userId } = await registerVerifiedUser('delivered-once');
      const created = await createNotificationFor(userId);

      const first = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', cookie)
        .expect(200);
      const firstItem = (first.body as NotificationsResponse).items.find(
        (n) => n.id === created.id,
      );
      expect(firstItem?.justDelivered).toBe(true);

      const second = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', cookie)
        .expect(200);
      const secondItem = (second.body as NotificationsResponse).items.find(
        (n) => n.id === created.id,
      );
      expect(secondItem?.justDelivered).toBe(false);
    });

    it("never returns another user's notifications", async () => {
      const owner = await registerVerifiedUser('owner-only');
      await createNotificationFor(owner.userId);
      const { cookie: otherCookie } = await registerVerifiedUser('other-viewer');

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', otherCookie)
        .expect(200);

      expect((response.body as NotificationsResponse).unreadCount).toBe(0);
      expect((response.body as NotificationsResponse).items).toHaveLength(0);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).post('/notifications/read-all').expect(401);
    });

    it('marks every unread notification as read, and is idempotent on a second call', async () => {
      const { cookie, userId } = await registerVerifiedUser('read-all');
      await createNotificationFor(userId);
      await createNotificationFor(userId);

      await request(app.getHttpServer())
        .post('/notifications/read-all')
        .set('Cookie', cookie)
        .expect(204);

      const afterFirst = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', cookie)
        .expect(200);
      expect((afterFirst.body as NotificationsResponse).unreadCount).toBe(0);
      expect(
        (afterFirst.body as NotificationsResponse).items.every((item) => item.readAt !== null),
      ).toBe(true);

      await request(app.getHttpServer())
        .post('/notifications/read-all')
        .set('Cookie', cookie)
        .expect(204);
    });
  });
});
