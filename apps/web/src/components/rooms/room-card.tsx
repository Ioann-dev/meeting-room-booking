import Link from 'next/link';
import type { RoomSummary } from 'shared';

export function RoomCard({ room }: { room: RoomSummary }) {
  return (
    <Link
      href={`/schedule/${room.id}`}
      className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-canvas"
    >
      <div>
        <p className="text-sm font-semibold text-ink">{room.name}</p>
        <p className="mt-0.5 text-xs text-ink-subtle">Floor {room.floor}</p>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-sm text-ink-muted">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 text-ink-faint">
          <path
            d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M3.5 17c.6-3.3 3.2-5.5 6.5-5.5s5.9 2.2 6.5 5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="tabular-nums">Seats {room.capacity}</span>
      </div>
    </Link>
  );
}
