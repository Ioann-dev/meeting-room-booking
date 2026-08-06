import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Every real request path has exactly one proxy hop in front of this
  // service (apps/web's rewrite in dev, the production reverse proxy --
  // see next.config.ts and docs/architecture.md), so trusting exactly one
  // level of X-Forwarded-For/Proto is what makes req.ip resolve to the
  // actual client rather than the proxy itself. Without this, every client
  // behind that one hop shares a single apparent IP -- silently collapsing
  // ThrottlerGuard's per-client rate limit into one shared bucket for
  // everyone (see auth.controller.ts), and making cookie.util.ts's
  // `request.secure` (used to set the cookie's Secure flag) unreliable
  // once TLS is terminated at the proxy instead of this process.
  app.set('trust proxy', 1);
  app.use(helmet());
  // Same-origin in every real deployment (apps/web proxies /api/* to this
  // service -- see next.config.ts -- and the production reverse proxy does
  // the same), so this exists as a defense-in-depth boundary for whenever
  // the API port itself is reachable directly (e.g. local dev), not because
  // a legitimate cross-origin caller is expected.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
  // Explicit, auditable limit rather than relying on body-parser's implicit
  // default -- this app never accepts file uploads or large payloads, so a
  // generous-looking request body is itself a signal worth rejecting early.
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
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

void bootstrap();
