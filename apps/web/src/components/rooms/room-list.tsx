import type { RoomSummary } from 'shared';
import { RoomCard } from './room-card';

export function RoomList({ rooms }: { rooms: RoomSummary[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}
