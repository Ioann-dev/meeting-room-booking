import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { BookingSeriesSummary } from 'shared';
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

describe('Series concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roomId: string;
  const roomName = `E2E Series Concurrency Room ${randomUUID()}`;

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

  // createSeries's application-level pre-check has the same race window as
  // create()'s (see booking-concurrency.e2e-spec.ts): two concurrent
  // requests can both read "no conflict" across the whole series window
  // before either transaction commits. This proves the database's
  // exclusion constraint -- not the pre-check -- is what makes a genuinely
  // concurrent series-creation race resolve correctly: exactly one series
  // (and none of its rows partially) persists, the loser gets a clean 409
  // naming the occurrence (never an unhandled 500 or a hung deadlock), and
  // no duplicate ACTIVE occurrence exists in the contested slot.
  it('persists exactly one series when two requests race for the identical recurring slot', async () => {
    const emailA = uniqueEmail('series-race-a');
    const emailB = uniqueEmail('series-race-b');
    const [registerA, registerB] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Series Racer A', email: emailA, password: 'ValidPass123' })
        .expect(201),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Series Racer B', email: emailB, password: 'ValidPass123' })
        .expect(201),
    ]);
    await prisma.user.updateMany({
      where: { email: { in: [emailA, emailB] } },
      data: { emailVerifiedAt: new Date() },
    });
    const cookieA = sessionCookieFrom(registerA);
    const cookieB = sessionCookieFrom(registerB);

    const occurrenceCount = 4;
    const payload = {
      title: 'Race Series',
      roomId,
      startAt: '2099-06-20T06:00:00.000Z', // Tue 09:00 Kyiv
      endAt: '2099-06-20T06:30:00.000Z',
      recurrence: { occurrenceCount },
    };

    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').set('Cookie', cookieA).send(payload),
      request(app.getHttpServer()).post('/bookings').set('Cookie', cookieB).send(payload),
    ]);

    const statuses = [responseA.status, responseB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]); // never [500, *], never [201, 201]

    const winner = responseA.status === 201 ? responseA : responseB;
    const loser = responseA.status === 409 ? responseA : responseB;
    expect((loser.body as { code: string }).code).toBe('SERIES_CONFLICT');
    const winnerBody = winner.body as BookingSeriesSummary;
    expect(winnerBody.bookings).toHaveLength(occurrenceCount);

    // Exactly one ACTIVE series for this room -- the loser's series row
    // (and every occurrence it may have started inserting before hitting
    // the conflict) was fully rolled back, not left as a partial series.
    const activeSeriesCount = await prisma.bookingSeries.count({
      where: { roomId, status: 'ACTIVE' },
    });
    expect(activeSeriesCount).toBe(1);

    // Exactly occurrenceCount ACTIVE bookings total for the room -- no
    // duplicate occurrences, no leftover rows from the loser.
    const activeBookingCount = await prisma.booking.count({ where: { roomId, status: 'ACTIVE' } });
    expect(activeBookingCount).toBe(occurrenceCount);

    // Exactly one ACTIVE booking in the specific contested first-occurrence
    // slot -- the actual overlap invariant, not just a row-count coincidence.
    const contestedSlot = await prisma.booking.findMany({
      where: {
        roomId,
        status: 'ACTIVE',
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
      },
    });
    expect(contestedSlot).toHaveLength(1);
  });
});
