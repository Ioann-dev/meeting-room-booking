import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { BookingSeriesSummary, BookingSummary } from 'shared';
import { OFFICE_TIMEZONE, toZonedParts, zonedWallTimeToUtc } from 'shared';
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

// Finds the office-local date of a Tuesday 09:00 Kyiv occurrence whose very
// next weekly occurrence (7 days later, same wall-clock time) falls on the
// other side of a Kyiv DST transition -- i.e. the two instants have
// different UTC offsets despite an identical office-local time-of-day.
// Searches forward from `daysAhead` days from now (rather than a pinned
// calendar year) so this test keeps working indefinitely instead of
// eventually asserting against a date that has become "the past".
function findDstCrossingTuesday(daysAhead: number): { year: number; month: number; day: number } {
  let cursor = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  while (cursor.getUTCDay() !== 2) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  for (let i = 0; i < 80; i++) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    const thisWeekUtc = zonedWallTimeToUtc(
      { year: y, month: m, day: d, hour: 9, minute: 0 },
      OFFICE_TIMEZONE,
    );

    const nextCursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ny = nextCursor.getUTCFullYear();
    const nm = nextCursor.getUTCMonth() + 1;
    const nd = nextCursor.getUTCDate();
    const nextWeekUtc = zonedWallTimeToUtc(
      { year: ny, month: nm, day: nd, hour: 9, minute: 0 },
      OFFICE_TIMEZONE,
    );

    if (new Date(thisWeekUtc).getUTCHours() !== new Date(nextWeekUtc).getUTCHours()) {
      return { year: y, month: m, day: d };
    }
    cursor = nextCursor;
  }
  throw new Error('Could not find a DST-crossing Tuesday within an 80-week search window');
}

describe('Recurrence (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roomId: string;
  const roomName = `E2E Recurrence Room ${randomUUID()}`;

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
    await prisma.bookingSeries.deleteMany({ where: { roomId } });
    await prisma.room.deleteMany({ where: { id: roomId } });
    await app.close();
  });

  describe('POST /bookings with recurrence', () => {
    it('creates a valid weekly series (the spec example: 8 occurrences)', async () => {
      const { cookie } = await registerVerifiedUser('series-basic');

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Weekly Sync',
          roomId,
          startAt: '2099-06-02T06:00:00.000Z', // Tue 09:00 Kyiv
          endAt: '2099-06-02T06:30:00.000Z',
          recurrence: { occurrenceCount: 8 },
        })
        .expect(201);

      const body = response.body as BookingSeriesSummary;
      expect(body.occurrenceCount).toBe(8);
      expect(body.bookings).toHaveLength(8);
      expect(body.bookings.map((b) => b.startAt)).toEqual([
        '2099-06-02T06:00:00.000Z',
        '2099-06-09T06:00:00.000Z',
        '2099-06-16T06:00:00.000Z',
        '2099-06-23T06:00:00.000Z',
        '2099-06-30T06:00:00.000Z',
        '2099-07-07T06:00:00.000Z',
        '2099-07-14T06:00:00.000Z',
        '2099-07-21T06:00:00.000Z',
      ]);
      expect(body.bookings.every((b) => b.seriesId === body.seriesId)).toBe(true);

      const seriesRow = await prisma.bookingSeries.findUniqueOrThrow({
        where: { id: body.seriesId },
      });
      expect(seriesRow.weekday).toBe(2); // Tuesday
      expect(seriesRow.startMinute).toBe(9 * 60);
      expect(seriesRow.endMinute).toBe(9 * 60 + 30);
      expect(seriesRow.occurrenceCount).toBe(8);
      expect(seriesRow.status).toBe('ACTIVE');
    });

    it('keeps office-local wall time across a real Kyiv DST transition', async () => {
      const { cookie } = await registerVerifiedUser('series-dst');
      const crossing = findDstCrossingTuesday(3);
      const firstStart = zonedWallTimeToUtc(
        { year: crossing.year, month: crossing.month, day: crossing.day, hour: 9, minute: 0 },
        OFFICE_TIMEZONE,
      );
      const firstEnd = zonedWallTimeToUtc(
        { year: crossing.year, month: crossing.month, day: crossing.day, hour: 9, minute: 30 },
        OFFICE_TIMEZONE,
      );

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'DST Sync',
          roomId,
          startAt: firstStart,
          endAt: firstEnd,
          recurrence: { occurrenceCount: 4 },
        })
        .expect(201);

      const body = response.body as BookingSeriesSummary;
      expect(body.bookings).toHaveLength(4);

      const utcOffsets = new Set<number>();
      for (const booking of body.bookings) {
        const parts = toZonedParts(booking.startAt, OFFICE_TIMEZONE);
        expect(parts.hour).toBe(9);
        expect(parts.minute).toBe(0);
        expect(parts.weekday).toBe(2); // every occurrence is still a Tuesday
        utcOffsets.add(parts.offsetMinutes);
      }
      // The whole point of the search: the 4-week span must actually cross
      // the transition, i.e. not every occurrence has the same UTC offset,
      // even though every occurrence has the identical office-local time.
      expect(utcOffsets.size).toBeGreaterThan(1);
    });

    it('rejects an occurrenceCount below the minimum', async () => {
      const { cookie } = await registerVerifiedUser('series-toofew');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-03T06:00:00.000Z',
          endAt: '2099-06-03T06:30:00.000Z',
          recurrence: { occurrenceCount: 1 },
        })
        .expect(400);
    });

    it('rejects an occurrenceCount above the maximum', async () => {
      const { cookie } = await registerVerifiedUser('series-toomany');

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-04T06:00:00.000Z',
          endAt: '2099-06-04T06:30:00.000Z',
          recurrence: { occurrenceCount: 53 },
        })
        .expect(400);
    });

    // Regression coverage for a fix: class-validator's @ValidateNested()
    // treats an array as a collection and validates its elements, so
    // `recurrence: []`/`recurrence: [{...}]` previously passed validation
    // with zero errors, reached BookingService.createSeries as a truthy
    // array whose `.occurrenceCount` is undefined, and crashed with an
    // unhandled 500 instead of a clean 400.
    describe('malformed recurrence input', () => {
      it.each([
        ['an empty array', []],
        ['an array containing an otherwise-valid object', [{ occurrenceCount: 4 }]],
        ['an array containing an empty object', [{}]],
        ['a string', 'weekly'],
        ['a number', 4],
        ['a boolean', true],
      ])('rejects recurrence as %s with 400, not 500', async (_label, recurrence) => {
        const { cookie } = await registerVerifiedUser('series-malformed');

        const response = await request(app.getHttpServer())
          .post('/bookings')
          .set('Cookie', cookie)
          .send({
            title: 'Bad',
            roomId,
            startAt: '2099-09-10T06:00:00.000Z',
            endAt: '2099-09-10T06:30:00.000Z',
            recurrence,
          })
          .expect(400);

        expect((response.body as { statusCode: number }).statusCode).toBe(400);
      });

      it('rejects a recurrence object with an unknown nested field', async () => {
        const { cookie } = await registerVerifiedUser('series-unknown-field');

        await request(app.getHttpServer())
          .post('/bookings')
          .set('Cookie', cookie)
          .send({
            title: 'Bad',
            roomId,
            startAt: '2099-09-11T06:00:00.000Z',
            endAt: '2099-09-11T06:30:00.000Z',
            recurrence: { occurrenceCount: 4, evil: true },
          })
          .expect(400);
      });

      it('treats a null recurrence the same as an absent one (creates a single booking)', async () => {
        const { cookie } = await registerVerifiedUser('series-null');

        const response = await request(app.getHttpServer())
          .post('/bookings')
          .set('Cookie', cookie)
          .send({
            title: 'Not Recurring',
            roomId,
            startAt: '2099-09-12T06:00:00.000Z',
            endAt: '2099-09-12T06:30:00.000Z',
            recurrence: null,
          })
          .expect(201);

        const body = response.body as BookingSummary;
        expect(body.id).toBeDefined();
        expect(body).not.toHaveProperty('bookings');
      });

      it('still creates a valid series when recurrence is a well-formed object', async () => {
        const { cookie } = await registerVerifiedUser('series-valid-recur');

        const response = await request(app.getHttpServer())
          .post('/bookings')
          .set('Cookie', cookie)
          .send({
            title: 'Valid Series',
            roomId,
            startAt: '2099-09-13T06:00:00.000Z',
            endAt: '2099-09-13T06:30:00.000Z',
            recurrence: { occurrenceCount: 3 },
          })
          .expect(201);

        const body = response.body as BookingSeriesSummary;
        expect(body.occurrenceCount).toBe(3);
        expect(body.bookings).toHaveLength(3);
      });
    });

    it('rejects an unverified user with 403', async () => {
      const email = uniqueEmail('series-unverified');
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Unverified', email, password: 'ValidPass123' })
        .expect(201);
      const cookie = sessionCookieFrom(registerResponse);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Bad',
          roomId,
          startAt: '2099-06-05T06:00:00.000Z',
          endAt: '2099-06-05T06:30:00.000Z',
          recurrence: { occurrenceCount: 4 },
        })
        .expect(403);
      expect((response.body as { code: string }).code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rolls back the entire series when one occurrence conflicts, naming it clearly', async () => {
      const { cookie } = await registerVerifiedUser('series-conflict');

      // Occurrence index 2 of a series starting 2099-06-06 lands on
      // 2099-06-20; pre-seed a booking that only conflicts with that one.
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Blocking booking',
          roomId,
          startAt: '2099-06-20T06:00:00.000Z',
          endAt: '2099-06-20T07:00:00.000Z',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Conflicting Series',
          roomId,
          startAt: '2099-06-06T06:00:00.000Z',
          endAt: '2099-06-06T06:30:00.000Z',
          recurrence: { occurrenceCount: 5 },
        })
        .expect(409);

      const body = response.body as { code: string; conflictingOccurrenceIndex: number };
      expect(body.code).toBe('SERIES_CONFLICT');
      expect(body.conflictingOccurrenceIndex).toBe(2);

      const persisted = await prisma.booking.count({
        where: { roomId, title: 'Conflicting Series' },
      });
      expect(persisted).toBe(0); // no partial series -- all-or-nothing
      const persistedSeries = await prisma.bookingSeries.count({
        where: { roomId, occurrenceCount: 5 },
      });
      expect(persistedSeries).toBe(0);
    });
  });

  describe('cancelling a series', () => {
    // Each test gets its own starting month (a 4-occurrence, 28-day span
    // fits comfortably within one) so concurrently-persisted series from
    // different test cases never collide on the same room/slot -- a
    // distinct concern from whether the service itself prevents overlap,
    // which is covered elsewhere.
    // Months 4-8 (April-August) are always deep in Kyiv's EEST (UTC+3)
    // period regardless of exactly which day the EU rule puts the
    // transition on in a given year, so 06:00Z consistently means 09:00
    // Kyiv here -- unlike January-March, which can be EET (UTC+2).
    let monthSeed = 3;
    async function createSeries(cookie: string, label: string, occurrenceCount = 4) {
      monthSeed += 1;
      const month = String(monthSeed).padStart(2, '0'); // 2100-04, 2100-05, ...
      const startAt = `2100-${month}-07T06:00:00.000Z`;
      const endAt = `2100-${month}-07T06:30:00.000Z`;
      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({ title: label, roomId, startAt, endAt, recurrence: { occurrenceCount } })
        .expect(201);
      return response.body as BookingSeriesSummary;
    }

    it('cancels a single occurrence via the existing booking-cancel endpoint', async () => {
      const { cookie } = await registerVerifiedUser('cancel-occurrence');
      const series = await createSeries(cookie, 'Cancel One Occurrence');
      const targetOccurrence = series.bookings[1]!;

      await request(app.getHttpServer())
        .post(`/bookings/${targetOccurrence.id}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      const rows = await prisma.booking.findMany({
        where: { seriesId: series.seriesId },
        select: { id: true, status: true },
      });
      const cancelled = rows.filter((r) => r.status === 'CANCELLED');
      const active = rows.filter((r) => r.status === 'ACTIVE');
      expect(cancelled).toHaveLength(1);
      expect(cancelled[0]!.id).toBe(targetOccurrence.id);
      expect(active).toHaveLength(series.bookings.length - 1);
    });

    it('cancels every active occurrence when the series is cancelled', async () => {
      const { cookie } = await registerVerifiedUser('cancel-series');
      const series = await createSeries(cookie, 'Cancel Whole Series');

      // Pre-cancel one occurrence, so the series-cancel endpoint's
      // updateMany(status: ACTIVE) is exercised against a mixed set.
      await request(app.getHttpServer())
        .post(`/bookings/${series.bookings[0]!.id}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      await request(app.getHttpServer())
        .post(`/bookings/series/${series.seriesId}/cancel`)
        .set('Cookie', cookie)
        .expect(204);

      const rows = await prisma.booking.findMany({
        where: { seriesId: series.seriesId },
        select: { status: true },
      });
      expect(rows.every((r) => r.status === 'CANCELLED')).toBe(true);

      const seriesRow = await prisma.bookingSeries.findUniqueOrThrow({
        where: { id: series.seriesId },
      });
      expect(seriesRow.status).toBe('CANCELLED');

      // Idempotent: cancelling an already-cancelled series again succeeds.
      await request(app.getHttpServer())
        .post(`/bookings/series/${series.seriesId}/cancel`)
        .set('Cookie', cookie)
        .expect(204);
    });

    it('rejects cancellation of a foreign series, even via direct API call', async () => {
      const owner = await registerVerifiedUser('series-owner');
      const attacker = await registerVerifiedUser('series-attacker');
      const series = await createSeries(owner.cookie, 'Protected Series');

      const response = await request(app.getHttpServer())
        .post(`/bookings/series/${series.seriesId}/cancel`)
        .set('Cookie', attacker.cookie)
        .expect(403);
      expect((response.body as { code: string }).code).toBe('FORBIDDEN_CANCELLATION');

      const rows = await prisma.booking.findMany({ where: { seriesId: series.seriesId } });
      expect(rows.every((r) => r.status === 'ACTIVE')).toBe(true);
    });

    it('rejects cancellation of a single occurrence by a foreign user', async () => {
      const owner = await registerVerifiedUser('occ-owner');
      const attacker = await registerVerifiedUser('occ-attacker');
      const series = await createSeries(owner.cookie, 'Protected Occurrence');

      const response = await request(app.getHttpServer())
        .post(`/bookings/${series.bookings[0]!.id}/cancel`)
        .set('Cookie', attacker.cookie)
        .expect(403);
      expect((response.body as { code: string }).code).toBe('FORBIDDEN_CANCELLATION');
    });

    it('returns 404 for a nonexistent series', async () => {
      const { cookie } = await registerVerifiedUser('series-missing');

      await request(app.getHttpServer())
        .post(`/bookings/series/${randomUUID()}/cancel`)
        .set('Cookie', cookie)
        .expect(404);
    });

    it('rejects an unauthenticated series-cancel request', async () => {
      const { cookie } = await registerVerifiedUser('series-unauth');
      const series = await createSeries(cookie, 'Untouched Series');

      await request(app.getHttpServer())
        .post(`/bookings/series/${series.seriesId}/cancel`)
        .expect(401);
    });
  });

  describe('GET /bookings/schedule includes series metadata', () => {
    it('returns the shared seriesId for every occurrence of a series', async () => {
      const { cookie } = await registerVerifiedUser('series-schedule');
      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', cookie)
        .send({
          title: 'Schedule Series',
          roomId,
          startAt: '2099-08-04T06:00:00.000Z',
          endAt: '2099-08-04T06:30:00.000Z',
          recurrence: { occurrenceCount: 3 },
        })
        .expect(201);
      const series = response.body as BookingSeriesSummary;

      const scheduleResponse = await request(app.getHttpServer())
        .get('/bookings/schedule')
        .query({ roomId, referenceDate: '2099-08-04T06:00:00.000Z' })
        .set('Cookie', cookie)
        .expect(200);

      const scheduled = (scheduleResponse.body as { bookings: BookingSummary[] }).bookings.find(
        (b) => b.title === 'Schedule Series',
      );
      expect(scheduled?.seriesId).toBe(series.seriesId);
    });
  });
});
