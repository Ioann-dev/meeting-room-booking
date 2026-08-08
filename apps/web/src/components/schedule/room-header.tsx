import Link from 'next/link';
import type { RoomSummary } from 'shared';
import { Button } from '@/components/ui/button';

interface RoomHeaderProps {
  room: RoomSummary;
  onBook: (trigger: HTMLButtonElement) => void;
}

export function RoomHeader({ room, onBook }: RoomHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <Link
          href="/schedule"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-subtle transition-colors duration-150 ease-premium hover:text-ink"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3">
            <path
              d="M9.5 3.5 5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All rooms
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{room.name}</h1>
      </div>
      {/* items-end, not items-center: bottom-aligns the metadata pills
          against the button's own bottom edge rather than its vertical
          center, which is what actually lines up cleanly against the
          left group's h1 baseline (a button's own text doesn't align to
          plain text the way items-baseline assumes across mixed element
          types). */}
      <div className="flex items-end gap-3">
        {/* Small productized metadata pills, not bare separated text --
            each fact reads as its own discrete chip rather than one run-on
            string. */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
          <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1">
            Floor {room.floor}
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-2.5 py-1 tabular-nums">
            Seats {room.capacity}
          </span>
        </div>
        <Button type="button" onClick={(event) => onBook(event.currentTarget)}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Book a room
        </Button>
      </div>
    </div>
  );
}
