import * as argon2 from 'argon2';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// A fixed hash of an unguessable, never-used password. login() verifies
// against this when no account matches the submitted email, so that path
// costs the same as a real (wrong-password) verification instead of
// returning near-instantly -- otherwise the response-time difference
// itself would let an attacker enumerate registered emails even though
// the error message is identical either way.
let dummyHash: Promise<string> | null = null;
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-account-timing-safety-placeholder');
  return dummyHash;
}
