import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { CurrentUser } from 'shared';
import { createTestApp } from './utils/bootstrap-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashToken } from '../src/auth/token.util';

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

function uniqueEmail(label: string): string {
  return `${label}.${randomUUID()}@example.com`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('trims the name and canonicalizes the email', async () => {
      const email = uniqueEmail('canon');
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: '  Ivan Test  ',
          email: `  ${email.toUpperCase()}  `,
          password: 'ValidPass123',
        })
        .expect(201);

      const body = response.body as CurrentUser;
      expect(body.name).toBe('Ivan Test');
      expect(body.email).toBe(email);
      expect(body.emailVerified).toBe(false);
      expect(sessionCookieFrom(response)).toMatch(/^session=.+/);
    });

    it('rejects a second registration whose email differs only by case', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'First', email, password: 'ValidPass123' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Second', email: email.toUpperCase(), password: 'ValidPass123' })
        .expect(409);
    });

    it.each([
      ['below the minimum', 'short12', 400],
      ['at the minimum', '12345678', 201],
      ['at the maximum', 'a'.repeat(72), 201],
      ['above the maximum', 'a'.repeat(73), 400],
    ])('password %s length is %i', async (_label, password, expectedStatus) => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Boundary', email: uniqueEmail('pw'), password })
        .expect(expectedStatus);
    });

    it('rejects a name longer than 100 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'a'.repeat(101), email: uniqueEmail('longname'), password: 'ValidPass123' })
        .expect(400);
    });

    it('accepts a name exactly 100 characters long', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'a'.repeat(100), email: uniqueEmail('maxname'), password: 'ValidPass123' })
        .expect(201);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with the canonicalized email regardless of case', async () => {
      const email = uniqueEmail('login');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Login User', email, password: 'ValidPass123' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: email.toUpperCase(), password: 'ValidPass123' })
        .expect(200);

      expect(sessionCookieFrom(response)).toMatch(/^session=.+/);
    });

    it('rejects an unknown email and a wrong password with the same message', async () => {
      const email = uniqueEmail('wrongpw');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Wrong Password User', email, password: 'ValidPass123' })
        .expect(201);

      const wrongPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'NotThePassword' })
        .expect(401);

      const unknownEmail = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail('never-registered'), password: 'Whatever123' })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });
  });

  describe('session persistence and logout', () => {
    it('keeps /auth/me authenticated across separate requests with the same cookie', async () => {
      const email = uniqueEmail('persist');
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Persist User', email, password: 'ValidPass123' })
        .expect(201);
      const cookie = sessionCookieFrom(registerResponse);

      // Simulates a page reload: a brand new request carrying only the cookie.
      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect((meResponse.body as CurrentUser).email).toBe(email);
    });

    it('rejects /auth/me with no cookie', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('deletes the session server-side on logout, invalidating the cookie', async () => {
      const email = uniqueEmail('logout');
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Logout User', email, password: 'ValidPass123' })
        .expect(201);
      const cookie = sessionCookieFrom(registerResponse);

      await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(204);

      await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);

      const remainingSessions = await prisma.session.count({
        where: { user: { email } },
      });
      expect(remainingSessions).toBe(0);
    });
  });

  describe('POST /auth/verify-email', () => {
    async function registerAndGetVerificationToken() {
      const email = uniqueEmail('verify');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Verify User', email, password: 'ValidPass123' })
        .expect(201);

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      const tokenRecord = await prisma.emailVerificationToken.findFirstOrThrow({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      return { email, user, tokenRecord };
    }

    it('marks the user verified and consumes the token', async () => {
      const email = uniqueEmail('verify-ok');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Verify Ok', email, password: 'ValidPass123' })
        .expect(201);

      // The raw token only ever exists in the logged link, never in the
      // database (only its hash is stored) -- generate one ourselves with
      // the same hash the service would have logged, by reading the stored
      // hash back out is not possible, so instead we drive this test
      // through a token we mint and insert directly for determinism.
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      const rawToken = `e2e-test-raw-token-verify-ok-${randomUUID()}`;
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: rawToken })
        .expect(204);

      const updated = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(updated.emailVerifiedAt).not.toBeNull();
    });

    it('rejects reusing an already-consumed token', async () => {
      const { user } = await registerAndGetVerificationToken();
      const rawToken = `e2e-test-raw-token-reuse-${randomUUID()}`;
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: rawToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: rawToken })
        .expect(400);
    });

    it('rejects an expired token', async () => {
      const { user } = await registerAndGetVerificationToken();
      const rawToken = `e2e-test-raw-token-expired-${randomUUID()}`;
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() - 1_000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: rawToken })
        .expect(400);
    });

    it('rejects a token that never existed', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'this-token-was-never-issued' })
        .expect(400);
    });
  });
});
