import Link from 'next/link';
import type { RoomSummary } from 'shared';

export function RoomHeader({ room }: { room: RoomSummary }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <Link
          href="/schedule"
          className="text-xs font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          ← All rooms
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">{room.name}</h1>
      </div>
      <p className="text-sm text-ink-subtle">
        Floor {room.floor} · Seats <span className="tabular-nums">{room.capacity}</span>
      </p>
    </div>
  );
}
