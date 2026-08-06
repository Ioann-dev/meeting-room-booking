import type { BookingSeriesSummary, BookingSummary, RecurrenceInput } from 'shared';
import { throwIfError } from './api-error';

export interface CreateBookingInput {
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
  recurrence?: RecurrenceInput;
}

/** `BookingSeriesSummary` has no top-level `id` -- see its doc comment in packages/shared/src/booking.ts. */
export function isBookingSeriesSummary(
  result: BookingSummary | BookingSeriesSummary,
): result is BookingSeriesSummary {
  return !('id' in result);
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingSummary | BookingSeriesSummary> {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  await throwIfError(response);
  return (await response.json()) as BookingSummary | BookingSeriesSummary;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
  await throwIfError(response);
}

export async function cancelBookingSeries(seriesId: string): Promise<void> {
  const response = await fetch(`/api/bookings/series/${seriesId}/cancel`, { method: 'POST' });
  await throwIfError(response);
}
