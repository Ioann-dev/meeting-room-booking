import type { RoomScheduleResponse } from 'shared';
import { throwIfError } from './api-error';

export async function fetchRoomSchedule(
  roomId: string,
  referenceDate?: string,
): Promise<RoomScheduleResponse> {
  const query = new URLSearchParams({ roomId });
  if (referenceDate) {
    query.set('referenceDate', referenceDate);
  }
  const response = await fetch(`/api/bookings/schedule?${query.toString()}`);
  await throwIfError(response);
  return (await response.json()) as RoomScheduleResponse;
}
