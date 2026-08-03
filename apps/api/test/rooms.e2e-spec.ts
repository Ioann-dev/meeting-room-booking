import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { RoomSummary } from 'shared';
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

async function registerAndGetCookie(app: INestApplication<App>): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name: 'Rooms Test User', email: uniqueEmail('rooms'), password: 'ValidPass123' })
    .expect(201);

  return sessionCookieFrom(response);
}

describe('Rooms (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  const suffix = randomUUID();
  const roomNames = {
    small: `E2E Small Room ${suffix}`,
    medium: `E2E Medium Room ${suffix}`,
    large: `E2E Large Room ${suffix}`,
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    cookie = await registerAndGetCookie(app);

    await prisma.room.createMany({
      data: [
        { name: roomNames.small, floor: 1, capacity: 2 },
        { name: roomNames.medium, floor: 2, capacity: 8 },
        { name: roomNames.large, floor: 3, capacity: 20 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.room.deleteMany({ where: { name: { in: Object.values(roomNames) } } });
    await app.close();
  });

  describe('GET /rooms', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/rooms').expect(401);
    });

    it('lists rooms ordered by name, with only client-facing fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/rooms')
        .set('Cookie', cookie)
        .expect(200);

      const body = response.body as RoomSummary[];
      const seeded = body.filter((room) => Object.values(roomNames).includes(room.name));
      expect(seeded).toHaveLength(3);
      expect(seeded.map((room) => room.name)).toEqual(
        [...Object.values(roomNames)].sort((a, b) => a.localeCompare(b)),
      );
      for (const room of seeded) {
        expect(Object.keys(room).sort()).toEqual(['capacity', 'floor', 'id', 'name']);
      }
    });
  });

  describe('GET /rooms/:id', () => {
    it('rejects an unauthenticated request', async () => {
      const room = await prisma.room.findUniqueOrThrow({ where: { name: roomNames.small } });
      await request(app.getHttpServer()).get(`/rooms/${room.id}`).expect(401);
    });

    it('returns a single room by id', async () => {
      const room = await prisma.room.findUniqueOrThrow({ where: { name: roomNames.small } });

      const response = await request(app.getHttpServer())
        .get(`/rooms/${room.id}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body).toEqual({
        id: room.id,
        name: roomNames.small,
        floor: 1,
        capacity: 2,
      });
    });

    it('returns 404 for a well-formed id that does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/rooms/${randomUUID()}`)
        .set('Cookie', cookie)
        .expect(404);
    });

    it('returns 400 for a malformed id', async () => {
      await request(app.getHttpServer()).get('/rooms/not-a-uuid').set('Cookie', cookie).expect(400);
    });
  });
});
