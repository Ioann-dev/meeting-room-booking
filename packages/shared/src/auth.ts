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

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}
