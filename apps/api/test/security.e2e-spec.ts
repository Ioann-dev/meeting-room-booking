import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, createThrottledTestApp } from './utils/bootstrap-app';

describe('Security headers and CORS (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets Helmet security headers and does not advertise the framework', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('never reflects an arbitrary request Origin back in CORS headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://attacker.example')
      .expect(200);

    const allowOrigin = response.headers['access-control-allow-origin'];
    expect(allowOrigin).not.toBe('https://attacker.example');
    expect(allowOrigin).not.toBe('*');
  });
});

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Needs the real ThrottlerGuard, unlike every other e2e suite (see
    // createTestApp's own comment on why it disables throttling for them).
    app = await createThrottledTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects login attempts past the configured per-minute threshold with 429', async () => {
    const email = `rate-limit.${randomUUID()}@example.com`;
    const payload = { email, password: 'DoesNotMatter123' };

    // AuthThrottlerGuard allows 10 requests/minute per account; none of
    // these should ever succeed (the account doesn't exist), so a non-429
    // status through the 10th request must be the credential check (401)
    // doing its job, not the rate limiter firing early or not at all.
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app.getHttpServer()).post('/auth/login').send(payload);
      expect(response.status).toBe(401);
    }

    const throttled = await request(app.getHttpServer()).post('/auth/login').send(payload);
    expect(throttled.status).toBe(429);
  });

  // Real proxy topology: apps/web forwards /api/* through Next's own
  // rewrites(), not a dedicated reverse proxy that adds or strips
  // X-Forwarded-For itself -- so a client-supplied X-Forwarded-For header
  // passes through to this service completely unmodified (see
  // AuthThrottlerGuard's own comment for the full reasoning). Keying the
  // tracker on the submitted email rather than req.ip closes both
  // failure modes that IP-based tracking had under that topology: an
  // attacker can no longer bypass the limit by rotating a spoofed
  // X-Forwarded-For header against one target account, and two different
  // real users never collide into one shared bucket just because they
  // happen to share a network path.
  it('closes the X-Forwarded-For bypass and keeps distinct accounts independent', async () => {
    const attackedEmail = `rate-limit-target.${randomUUID()}@example.com`;
    const payload = { email: attackedEmail, password: 'DoesNotMatter123' };

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app.getHttpServer()).post('/auth/login').send(payload);
      expect(response.status).toBe(401);
    }
    const throttled = await request(app.getHttpServer()).post('/auth/login').send(payload);
    expect(throttled.status).toBe(429);

    // The exact bypass the prior IP-keyed guard allowed: rotate a
    // client-supplied X-Forwarded-For header on every request against the
    // same target account. This must still be throttled.
    const spoofedBypassAttempt = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.0.0.${Math.floor(Math.random() * 250) + 1}`)
      .send(payload);
    expect(spoofedBypassAttempt.status).toBe(429);

    // A different account, from the exact same connection and with no
    // spoofed headers at all (the realistic "another real user behind the
    // same web process" case), gets its own independent bucket.
    const otherEmail = `rate-limit-other.${randomUUID()}@example.com`;
    const otherAccount = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, password: 'DoesNotMatter123' });
    expect(otherAccount.status).toBe(401);
  });
});
