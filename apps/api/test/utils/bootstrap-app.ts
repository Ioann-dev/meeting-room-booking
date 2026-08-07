import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AuthThrottlerGuard } from '../../src/auth/guards/auth-throttler.guard';

async function buildApp(moduleFixture: TestingModule): Promise<INestApplication<App>> {
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

// Mirrors src/main.ts's bootstrap exactly, so e2e tests exercise the same
// middleware/pipe pipeline production requests actually go through -- except
// rate limiting, which is disabled here: most e2e files register/log in far
// more than the real per-minute auth limit permits (auth.e2e-spec.ts alone
// makes 17 such calls, not all against distinct emails), and letting that
// throttle bleed into unrelated suites would make the whole run
// order-dependent and flaky. The real throttling behavior is proven
// separately by createThrottledTestApp below.
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AuthThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  return buildApp(moduleFixture);
}

// Real AuthThrottlerGuard left in place, for the one spec that needs to
// prove rate limiting actually rejects requests past the configured limit.
export async function createThrottledTestApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  return buildApp(moduleFixture);
}
