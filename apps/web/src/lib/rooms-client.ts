import type { RoomSummary } from 'shared';
import { throwIfError } from './api-error';

export async function fetchRooms(minCapacity?: number): Promise<RoomSummary[]> {
  const query = minCapacity === undefined ? '' : `?minCapacity=${minCapacity}`;
  const response = await fetch(`/api/rooms${query}`);
  await throwIfError(response);
  return (await response.json()) as RoomSummary[];
}
