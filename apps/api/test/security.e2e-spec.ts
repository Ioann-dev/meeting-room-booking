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

    // The @Throttle override on POST /auth/login allows 10 requests/minute;
    // none of these should ever succeed (the account doesn't exist), so a
    // non-429 status through the 10th request must be the credential check
    // (401) doing its job, not the rate limiter firing early or not at all.
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app.getHttpServer()).post('/auth/login').send(payload);
      expect(response.status).toBe(401);
    }

    const throttled = await request(app.getHttpServer()).post('/auth/login').send(payload);
    expect(throttled.status).toBe(429);
  });

  // ThrottlerGuard keys its bucket on req.ip, and every real request to this
  // API passes through exactly one proxy hop (apps/web's rewrite in dev, a
  // reverse proxy in production -- see main.ts's `trust proxy` comment).
  // Without `trust proxy` configured, Express ignores X-Forwarded-For
  // entirely and every client resolves to the same req.ip (the proxy's own
  // socket), so two *different* real users would silently share one login
  // bucket -- one busy or malicious client locks out everyone else behind
  // the same proxy. This proves distinct forwarded clients get independent
  // buckets instead.
  it('tracks distinct forwarded clients independently, not as one shared bucket', async () => {
    const email = `rate-limit-proxy.${randomUUID()}@example.com`;
    const payload = { email, password: 'DoesNotMatter123' };

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '10.0.0.1')
        .send(payload);
      expect(response.status).toBe(401);
    }
    const stillThrottledForFirstClient = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send(payload);
    expect(stillThrottledForFirstClient.status).toBe(429);

    const secondClient = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send(payload);
    expect(secondClient.status).toBe(401);
  });
});
