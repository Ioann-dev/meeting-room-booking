import type { MyPastBookingsResponse, MyUpcomingBookingsResponse } from 'shared';
import { throwIfError } from './api-error';

export async function fetchMyUpcomingBookings(): Promise<MyUpcomingBookingsResponse> {
  const response = await fetch('/api/bookings/mine?scope=upcoming');
  await throwIfError(response);
  return (await response.json()) as MyUpcomingBookingsResponse;
}

export async function fetchMyPastBookings(
  cursor?: string,
  limit?: number,
): Promise<MyPastBookingsResponse> {
  const query = new URLSearchParams({ scope: 'past' });
  if (cursor) {
    query.set('cursor', cursor);
  }
  if (limit) {
    query.set('limit', String(limit));
  }
  const response = await fetch(`/api/bookings/mine?${query.toString()}`);
  await throwIfError(response);
  return (await response.json()) as MyPastBookingsResponse;
}
