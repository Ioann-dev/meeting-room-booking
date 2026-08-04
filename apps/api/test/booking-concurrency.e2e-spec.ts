import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
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

describe('Booking concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roomId: string;
  const roomName = `E2E Concurrency Room ${randomUUID()}`;

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

  // The application-level pre-check (booking.service.ts) is not itself
  // race-safe -- two concurrent requests can both read "no conflict" before
  // either INSERT commits. This test proves the database's exclusion
  // constraint (docs/decisions/0001-booking-overlap.md) is what actually
  // makes the outcome correct under a real race, not the pre-check alone.
  it('persists exactly one active booking when two requests race for the same slot', async () => {
    const emailA = uniqueEmail('race-a');
    const emailB = uniqueEmail('race-b');
    const [registerA, registerB] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Racer A', email: emailA, password: 'ValidPass123' })
        .expect(201),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Racer B', email: emailB, password: 'ValidPass123' })
        .expect(201),
    ]);
    await prisma.user.updateMany({
      where: { email: { in: [emailA, emailB] } },
      data: { emailVerifiedAt: new Date() },
    });
    const cookieA = sessionCookieFrom(registerA);
    const cookieB = sessionCookieFrom(registerB);

    const payload = {
      title: 'Race Slot',
      roomId,
      startAt: '2099-06-20T06:00:00.000Z',
      endAt: '2099-06-20T06:30:00.000Z',
    };

    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').set('Cookie', cookieA).send(payload),
      request(app.getHttpServer()).post('/bookings').set('Cookie', cookieB).send(payload),
    ]);

    const statuses = [responseA.status, responseB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const conflictResponse = responseA.status === 409 ? responseA : responseB;
    expect((conflictResponse.body as { code: string }).code).toBe('BOOKING_CONFLICT');

    const activeBookings = await prisma.booking.findMany({
      where: {
        roomId,
        status: 'ACTIVE',
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
      },
    });
    expect(activeBookings).toHaveLength(1);
  });
});
