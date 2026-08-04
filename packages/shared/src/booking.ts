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
  /**
   * Non-null when this booking is one occurrence of a weekly recurring
   * series; the UI uses it to decide whether to offer a "cancel this
   * occurrence vs. cancel the whole series" choice.
   */
  seriesId: string | null;
}

// Not otherwise specified by the participant spec beyond "e.g. 8
// occurrences"; a single occurrence isn't a recurrence, and an upper bound
// keeps one request from generating an unbounded number of rows in one
// transaction.
export const RECURRENCE_MIN_OCCURRENCES = 2;
export const RECURRENCE_MAX_OCCURRENCES = 52;

export interface RecurrenceInput {
  occurrenceCount: number;
}

/**
 * Returned by POST /bookings instead of a single BookingSummary when the
 * request included a `recurrence` input. Structurally distinct from
 * BookingSummary (no top-level `id`), so a client can tell which shape it
 * got without a separate discriminant field.
 */
export interface BookingSeriesSummary {
  seriesId: string;
  roomId: string;
  occurrenceCount: number;
  bookings: BookingSummary[];
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
  // Distinct from BOOKING_CONFLICT: a series conflict identifies which
  // occurrence of the recurring pattern collided, since "the third Tuesday
  // conflicts" is a different, more useful message than the single-booking
  // "this slot is booked" for a request that was never about one slot.
  SERIES_CONFLICT: 'SERIES_CONFLICT',
} as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];

export interface BookingErrorBody {
  code: BookingErrorCode;
  message: string;
}
