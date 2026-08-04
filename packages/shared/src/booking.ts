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
