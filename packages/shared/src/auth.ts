export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

// Not otherwise specified by the participant spec; matches the booking
// title's stated 1-100 char bound elsewhere in the spec, since a user's
// name is displayed the same way (as the booking author). Registration is
// unauthenticated, so this also bounds what an anonymous request can force
// into the database via an otherwise-unbounded string field.
export const NAME_MAX_LENGTH = 100;

// Trim + lowercase is the canonical form stored and looked up server-side;
// exported so client-side hints and server DTOs apply the same rule rather
// than each re-implementing it.
export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// A deliberately lightweight "looks like an email" syntax check -- one
// @ with non-whitespace on both sides and at least one dot in the domain
// part -- shared by the login/register forms so a client can show a field-
// level error before submitting, instead of a malformed address only
// surfacing as a top-level alert after a round trip. This is a UX hint,
// not the authority: the server's own class-validator `@IsEmail()` DTO
// validation (apps/api/src/auth/dto/*.dto.ts) remains the real boundary,
// so this never needs to match its full RFC-5322-ish behavior exactly.
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT_PATTERN.test(email.trim());
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}
