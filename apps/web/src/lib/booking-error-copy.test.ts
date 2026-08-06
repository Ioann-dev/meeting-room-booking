import { BOOKING_ERROR_CODES } from 'shared';
import { ApiError } from './api-error';
import { bookingErrorMessage } from './booking-error-copy';

describe('bookingErrorMessage', () => {
  it('gives conflict copy that explains why and what to do next', () => {
    const error = new ApiError(
      409,
      ['This time slot is already booked'],
      BOOKING_ERROR_CODES.BOOKING_CONFLICT,
    );
    expect(bookingErrorMessage(error)).toBe(
      'This slot was just booked by someone else. Pick another time.',
    );
  });

  it('gives past-start copy that is more actionable than the raw server message', () => {
    const error = new ApiError(
      400,
      ['Bookings must start in the future'],
      BOOKING_ERROR_CODES.PAST_START,
    );
    expect(bookingErrorMessage(error)).toBe('This time has already passed. Pick a later slot.');
  });

  it('passes the server message through for outside-office-hours, appending nothing extra', () => {
    const error = new ApiError(
      400,
      ['Bookings must fall entirely within office hours (09:00-19:00 Europe/Kyiv)'],
      BOOKING_ERROR_CODES.OUTSIDE_OFFICE_HOURS,
    );
    expect(bookingErrorMessage(error)).toBe(
      'Bookings must fall entirely within office hours (09:00-19:00 Europe/Kyiv)',
    );
  });

  it('appends a follow-up hint to the server series-conflict message without re-deriving its detail', () => {
    const error = new ApiError(
      409,
      [
        'This recurring booking conflicts with an existing booking on 2026-11-03 09:00 Europe/Kyiv (occurrence 3 of 8)',
      ],
      BOOKING_ERROR_CODES.SERIES_CONFLICT,
    );
    expect(bookingErrorMessage(error)).toBe(
      'This recurring booking conflicts with an existing booking on 2026-11-03 09:00 Europe/Kyiv (occurrence 3 of 8) Adjust the start time or repeat count and try again.',
    );
  });

  it('gives an actionable message for an unverified email without inventing a resend action', () => {
    const error = new ApiError(
      403,
      ['Please verify your email address to continue'],
      BOOKING_ERROR_CODES.EMAIL_NOT_VERIFIED,
    );
    expect(bookingErrorMessage(error)).toBe(
      'Verify your email to book a room -- check the link we sent when you registered.',
    );
  });

  it('passes the server message through for forbidden cancellation', () => {
    const error = new ApiError(
      403,
      ['You can only cancel your own booking'],
      BOOKING_ERROR_CODES.FORBIDDEN_CANCELLATION,
    );
    expect(bookingErrorMessage(error)).toBe('You can only cancel your own booking');
  });

  it('falls back to a generic message when there is no code at all', () => {
    const error = new ApiError(500, []);
    expect(bookingErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });
});
