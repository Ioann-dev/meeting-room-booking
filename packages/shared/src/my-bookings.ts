// Default page size for GET /bookings/mine?scope=past's keyset pagination;
// exported so the web client's default request and any future server-side
// bound stay in one place rather than each guessing a number independently.
export const MY_BOOKINGS_PAST_PAGE_SIZE = 10;

export type MyBookingStatus = 'ACTIVE' | 'CANCELLED';

/**
 * A booking as returned by the current user's own booking list. Distinct
 * from `BookingSummary` (the schedule-grid shape): this always belongs to
 * the requester (no `isOwnBooking`/`authorName` needed), carries `roomName`
 * for a room-agnostic list, and `status` since the Past list mixes
 * naturally-completed and cancelled bookings.
 */
export interface MyBookingSummary {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  startAt: string;
  endAt: string;
  status: MyBookingStatus;
  /** Non-null when part of a weekly recurring series -- see BookingSummary's equivalent field. */
  seriesId: string | null;
}

/** Every still-active booking that hasn't ended yet, nearest first. Not paginated. */
export interface MyUpcomingBookingsResponse {
  items: MyBookingSummary[];
}

/**
 * Everything else the user has ever booked (ended and/or cancelled),
 * newest first. `nextCursor` is an opaque token to pass back as the next
 * request's `cursor`; `null` means there is no further page.
 */
export interface MyPastBookingsResponse {
  items: MyBookingSummary[];
  nextCursor: string | null;
}
