import { randomBytes, createHash } from 'node:crypto';

// Opaque bearer tokens (session cookies, email-verification links): the raw
// value is only ever held by the client, never persisted. Only its SHA-256
// hash is stored, so a database leak alone can't be replayed as a live
// session or a usable verification link.
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
