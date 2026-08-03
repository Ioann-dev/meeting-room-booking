import type { CookieOptions, Request } from 'express';
import { SESSION_TTL_MS } from './auth.constants';

// `secure` follows the request itself (true only when it arrived over
// HTTPS) rather than a fixed environment flag, so the same code is correct
// in local HTTP dev and behind TLS in production.
export function sessionCookieOptions(request: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}
