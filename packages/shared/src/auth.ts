export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

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
