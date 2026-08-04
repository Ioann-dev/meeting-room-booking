import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { BookingSummary, RoomScheduleResponse } from 'shared';
import { createTestApp } from './utils/bootstrap-app';
import { PrismaService } from '../src/prisma/prisma.service';

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

describe('Booking (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roomId: string;
  const roomName = `E2E Booking Room ${randomUUID()}`;

  async function registerVerifiedUser(label: string): Promise<{ cookie: string; name: string }> {
    const name = `${label} User`;
    const email = uniqueEmail(label);
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name, email, password: 'ValidPass123' })
      .expect(201);
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
    return { cookie: sessionCookieFrom(response), name };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    const room = await prisma.room.create({ data: { name: roomName, floor: 9, capacity: 6 } });
    roomId = room.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { roomId } });
    await prisma.room.deleteMany({ where: { id: roomId } });
    await app.close();
  });

  describe('POST /bookings', () => {
    it('creates a booking for a verified user with valid input', async () => {
      const { cookie } = await registerVerifiedUser('create-ok');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Sprint Planning',
          roomId,
          startAt: '2099-06-01T06:00:00.000Z',
          endAt: '2099-06-01T06:30:00.000Z',
        })
        .expect(201);

      const body = response.body as BookingSummary;
      expect(body.title).toBe('Sprint Planning');
      expect(body.roomId).toBe(roomId);
      expect(body.isOwnBooking).toBe(true);
      expect(body.seriesId).toBeNull();
    });

    it('allows an adjacent booking that starts exactly when the first ends', async () => {
      const { cookie } = await registerVerifiedUser('adjacency');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'First',
          roomId,
          startAt: '2099-06-02T06:00:00.000Z',
          endAt: '2099-06-02T07:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Second',
          roomId,
          startAt: '2099-06-02T07:00:00.000Z',
          endAt: '2099-06-02T08:00:00.000Z',
        })
        .expect(201);
    });

    it('rejects an overlapping booking with a 409 conflict', async () => {
      const { cookie } = await registerVerifiedUser('overlap');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Base',
          roomId,
          startAt: '2099-06-03T06:00:00.000Z',
          endAt: '2099-06-03T07:00:00.000Z',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Conflict',
          roomId,
          startAt: '2099-06-03T06:30:00.000Z',
          endAt: '2099-06-03T07:30:00.000Z',
        })
        .expect(409);

      expect((response.body as { code: string }).code).toBe('BOOKING_CONFLICT');
    });

    it('rejects a start/end not on the 30-minute grid', async () => {
      const { cookie } = await registerVerifiedUser('misaligned');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-04T06:15:00.000Z',
          endAt: '2099-06-04T06:45:00.000Z',
        })
        .expect(400);

      expect((response.body as { code: string }).code).toBe('SLOT_MISALIGNED');
    });

    it('rejects a duration outside 30 minutes-4 hours', async () => {
      const { cookie } = await registerVerifiedUser('duration');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-05T06:00:00.000Z',
          endAt: '2099-06-05T10:30:00.000Z', // 4.5 hours
        })
        .expect(400);

      expect((response.body as { code: string }).code).toBe('DURATION_INVALID');
    });

    it('rejects a booking that starts in the past', async () => {
      const { cookie } = await registerVerifiedUser('past');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2020-01-01T06:00:00.000Z',
          endAt: '2020-01-01T06:30:00.000Z',
        })
        .expect(400);

      expect((response.body as { code: string }).code).toBe('PAST_START');
    });

    it('rejects a booking outside office hours', async () => {
      const { cookie } = await registerVerifiedUser('hours');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-06T20:00:00.000Z', // 23:00 Kyiv
          endAt: '2099-06-06T20:30:00.000Z',
        })
        .expect(400);

      expect((response.body as { code: string }).code).toBe('OUTSIDE_OFFICE_HOURS');
    });

    it('rejects a nonexistent room with 404', async () => {
      const { cookie } = await registerVerifiedUser('noroom');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId: randomUUID(),
          startAt: '2099-06-07T06:00:00.000Z',
          endAt: '2099-06-07T06:30:00.000Z',
        })
        .expect(404);
    });

    it('rejects a title over 100 characters', async () => {
      const { cookie } = await registerVerifiedUser('longtitle');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'a'.repeat(101),
          roomId,
          startAt: '2099-06-08T06:00:00.000Z',
          endAt: '2099-06-08T06:30:00.000Z',
        })
        .expect(400);
    });

    it('rejects an unverified user with 403', async () => {
      const email = uniqueEmail('unverified');
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Unverified User', email, password: 'ValidPass123' })
        .expect(201);
      const cookie = sessionCookieFrom(registerResponse);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-09T06:00:00.000Z',
          endAt: '2099-06-09T06:30:00.000Z',
        })
        .expect(403);

      expect((response.body as { code: string }).code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-10T06:00:00.000Z',
          endAt: '2099-06-10T06:30:00.000Z',
        })
        .expect(401);
    });
  });

  describe('GET /bookings/schedule', () => {
    it('returns active bookings for the room with a correct ownership flag per viewer', async () => {
      const owner = await registerVerifiedUser('sched-owner');
      const viewer = await registerVerifiedUser('sched-viewer');

      const created = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', owner.cookie)
        .send({
          title: 'Visible Booking',
          roomId,
          startAt: '2099-06-11T06:00:00.000Z',
          endAt: '2099-06-11T06:30:00.000Z',
        })
        .expect(201);
      const bookingId = (created.body as BookingSummary).id;

      const asOwner = await request(app.getHttpServer())
        .get('/bookings/schedule')
        .query({ roomId, referenceDate: '2099-06-11T06:00:00.000Z' })
        .set('Cookie', owner.cookie)
        .expect(200);
      const ownerEntry = (asOwner.body as RoomScheduleResponse).bookings.find(
        (b) => b.id === bookingId,
      );
      expect(ownerEntry?.isOwnBooking).toBe(true);
      expect(ownerEntry?.authorName).toBe(owner.name);

      const asViewer = await request(app.getHttpServer())
        .get('/bookings/schedule')
        .query({ roomId, referenceDate: '2099-06-11T06:00:00.000Z' })
        .set('Cookie', viewer.cookie)
        .expect(200);
      const viewerEntry = (asViewer.body as RoomScheduleResponse).bookings.find(
        (b) => b.id === bookingId,
      );
      expect(viewerEntry?.isOwnBooking).toBe(false);
      expect(viewerEntry?.authorName).toBe(owner.name);
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/bookings/schedule').query({ roomId }).expect(401);
    });
  });

  describe('POST /bookings/:id/cancel', () => {
    it('allows the owner to cancel their own booking, idempotently', async () => {
      const { cookie } = await registerVerifiedUser('cancel-own');
      const created = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'To Cancel',
          roomId,
          startAt: '2099-06-12T06:00:00.000Z',
          endAt: '2099-06-12T06:30:00.000Z',
        })
        .expect(201);
      const bookingId = (created.body as BookingSummary).id;

      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      // Idempotent: cancelling an already-cancelled booking you own is a
      // no-op success, not an error.
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(stored.status).toBe('CANCELLED');
    });

    it('lets a new booking reuse the slot vacated by a cancelled booking', async () => {
      const { cookie } = await registerVerifiedUser('cancel-reuse');
      const created = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Original',
          roomId,
          startAt: '2099-06-13T06:00:00.000Z',
          endAt: '2099-06-13T06:30:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/bookings/${(created.body as BookingSummary).id}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Replacement',
          roomId,
          startAt: '2099-06-13T06:00:00.000Z',
          endAt: '2099-06-13T06:30:00.000Z',
        })
        .expect(201);
    });

    it('rejects cancellation by a non-owner, even via a direct API call', async () => {
      const owner = await registerVerifiedUser('cancel-owner2');
      const attacker = await registerVerifiedUser('cancel-attacker');
      const created = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', owner.cookie)
        .send({
          title: 'Protected',
          roomId,
          startAt: '2099-06-14T06:00:00.000Z',
          endAt: '2099-06-14T06:30:00.000Z',
        })
        .expect(201);
      const bookingId = (created.body as BookingSummary).id;

      const response = await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Cookie', attacker.cookie)
        .expect(403);
      expect((response.body as { code: string }).code).toBe('FORBIDDEN_CANCELLATION');

      const stored = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      expect(stored.status).toBe('ACTIVE');
    });

    it('returns 404 for a nonexistent booking', async () => {
      const { cookie } = await registerVerifiedUser('cancel-missing');

      await request(app.getHttpServer())
        .post(`/bookings/${randomUUID()}/cancel`)
        .set('Cookie', cookie)
        .expect(404);
    });

    it('rejects an unauthenticated cancellation request', async () => {
      const { cookie } = await registerVerifiedUser('cancel-unauth-target');
      const created = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Untouched',
          roomId,
          startAt: '2099-06-15T06:00:00.000Z',
          endAt: '2099-06-15T06:30:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/bookings/${(created.body as BookingSummary).id}/cancel`)
        .expect(401);
    });
  });
});
