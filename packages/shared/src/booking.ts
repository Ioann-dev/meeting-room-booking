// Not otherwise specified by the participant spec beyond "title, 1-100 chars";
// exported so DTO validation on the API and form hints on the web apply the
// same bound rather than each re-declaring it.
export const BOOKING_TITLE_MIN_LENGTH = 1;
export const BOOKING_TITLE_MAX_LENGTH = 100;

/**
 * A single booking as returned by the schedule query and create/cancel
 * responses. `startAt`/`endAt` are UTC instant ISO strings; the office-zone
 * conversion for display happens entirely on `web`. `isOwnBooking` is the
 * ownership signal the UI needs (e.g. for distinct styling) without
 * exposing the raw owner id to every viewer of a shared room schedule.
 */
export interface BookingSummary {
  id: string;
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
  authorName: string;
  isOwnBooking: boolean;
  /** Set once recurrence (Phase 06) exists; always null until then. */
  seriesId: string | null;
}

export interface RoomScheduleResponse {
  roomId: string;
  /** Inclusive UTC instant of the office-local week start (Monday 00:00). */
  weekStartUtc: string;
  /** Exclusive UTC instant of the office-local week end (next Monday 00:00). */
  weekEndUtc: string;
  bookings: BookingSummary[];
}

// Machine-readable discriminators for the booking-rejection categories the
// spec calls out by name, carried alongside the human-readable `message` in
// every rejection response body -- so a client can branch on `code` without
// parsing prose, while the message stays free to read naturally.
export const BOOKING_ERROR_CODES = {
  SLOT_MISALIGNED: 'SLOT_MISALIGNED',
  DURATION_INVALID: 'DURATION_INVALID',
  PAST_START: 'PAST_START',
  OUTSIDE_OFFICE_HOURS: 'OUTSIDE_OFFICE_HOURS',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  FORBIDDEN_CANCELLATION: 'FORBIDDEN_CANCELLATION',
} as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];

export interface BookingErrorBody {
  code: BookingErrorCode;
  message: string;
}
