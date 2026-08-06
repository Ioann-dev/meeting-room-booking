import { BOOKING_ERROR_CODES } from 'shared';
import { ApiError } from './api-error';

/**
 * Turns a booking-domain `ApiError` into copy that tells the user what to do
 * next, not just what went wrong. Shared between the create and cancel
 * flows so the two never drift on wording for the same `code`. Falls back
 * to the server's own message for codes that are already specific (or that
 * this UI makes structurally unreachable, e.g. SLOT_MISALIGNED) and to a
 * generic message when there's no `code` at all (network failure, 500).
 */
export function bookingErrorMessage(error: ApiError): string {
  switch (error.code) {
    case BOOKING_ERROR_CODES.PAST_START:
      return 'This time has already passed. Pick a later slot.';
    case BOOKING_ERROR_CODES.BOOKING_CONFLICT:
      return 'This slot was just booked by someone else. Pick another time.';
    case BOOKING_ERROR_CODES.SERIES_CONFLICT:
      return `${error.messages.join(' ')} Adjust the start time or repeat count and try again.`;
    case BOOKING_ERROR_CODES.EMAIL_NOT_VERIFIED:
      return 'Verify your email to book a room -- check the link we sent when you registered.';
    case BOOKING_ERROR_CODES.SLOT_MISALIGNED:
    case BOOKING_ERROR_CODES.DURATION_INVALID:
    case BOOKING_ERROR_CODES.OUTSIDE_OFFICE_HOURS:
    case BOOKING_ERROR_CODES.FORBIDDEN_CANCELLATION:
      return error.messages.join(' ');
    default:
      return error.messages.join(' ') || 'Something went wrong. Please try again.';
  }
}
